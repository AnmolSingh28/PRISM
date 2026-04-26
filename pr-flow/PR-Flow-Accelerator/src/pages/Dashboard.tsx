import React, { useEffect, useState } from "react";
import { MetricsPanel } from "../components/MetricsPanel";
import { PRTable } from "../components/PRTable.tsx";
import { ReviewerAssignmentPanel } from "../components/ReviewerAssignmentPanel";
import { SLAAlerts } from "../components/SLAAlerts";
import { ReviewerAssignmentEngine } from "../services/assignmentEngine";
import { BitbucketService } from "../services/bitbucketService";
import { MetricsService } from "../services/metricService";
import { AssignmentRecommendation, Developer, PullRequest, TeamMetrics } from "../types";

interface DashboardProps {
  workspace: string;
  repoSlug: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ workspace, repoSlug }) => {
  // State management
  const [prs, setPRs] = useState<PullRequest[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [recommendation, setRecommendation] = useState<AssignmentRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);

  // Services
  const bitbucketService = new BitbucketService();
  const assignmentEngine = new ReviewerAssignmentEngine();
  const metricsService = new MetricsService();

  /**
   * Initial load - fetch PRs and developers
   */
  useEffect(() => {
    loadDashboardData();
  }, [workspace, repoSlug]);

  /**
   * When PRs change, recalculate metrics
   */
  useEffect(() => {
    if (prs.length > 0 && developers.length > 0) {
      const newMetrics = metricsService.calculateTeamMetrics(prs, developers);
      setMetrics(newMetrics);
    }
  }, [prs, developers]);

  /**
   * Auto-assign reviewers when PR is selected
   */
  useEffect(() => {
    if (selectedPR) {
      generateRecommendations(selectedPR);
    }
  }, [selectedPR]);

  /**
   * Load all dashboard data
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch PRs and developers in parallel
      const [fetchedPRs, fetchedDevs] = await Promise.all([
        bitbucketService.fetchOpenPRs(workspace, repoSlug),
        bitbucketService.getTeamMembers(workspace),
      ]);

      setPRs(fetchedPRs);
      setDevelopers(fetchedDevs);
    } catch (err) {
      setError(`Failed to load dashboard: ${err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate reviewer recommendations for selected PR
   */
  const generateRecommendations = async (pr: PullRequest) => {
    try {
      const rec = await assignmentEngine.getBestReviewers(pr, developers, 2);
      setRecommendation(rec);
    } catch (err) {
      console.error('Error generating recommendations:', err);
    }
  };

  /**
   * Handle assigning reviewers
   */
  const handleAssignReviewers = async (pr: PullRequest, reviewerIds: string[]) => {
    try {
      setAutoAssigning(true);

      // Call Bitbucket API for each reviewer
      for (const reviewerId of reviewerIds) {
        await bitbucketService.assignReviewer(workspace, repoSlug, pr.id, reviewerId);
      }

      // Update local state
      const updated = prs.map((p) =>
        p.id === pr.id
          ? {
              ...p,
              reviewers: reviewerIds.map((rid) => ({
                reviewer: developers.find((d) => d.id === rid)!,
                status: 'REQUESTED' as const,
              })),
              autoAssignedAt: new Date(),
            }
          : p
      );

      setPRs(updated);
      setSelectedPR(updated.find((p) => p.id === pr.id) || null);
    } catch (err) {
      setError(`Failed to assign reviewers: ${err}`);
      console.error(err);
    } finally {
      setAutoAssigning(false);
    }
  };

  /**
   * Auto-assign all open PRs without reviewers
   */
  const handleAutoAssignAll = async () => {
    try {
      setAutoAssigning(true);

      const unassignedPRs = prs.filter((pr) => pr.reviewers.length === 0);

      for (const pr of unassignedPRs) {
        const rec = await assignmentEngine.getBestReviewers(pr, developers, 2);
        const reviewerIds = rec.recommended.map((r) => r.reviewer.id);
        await handleAssignReviewers(pr, reviewerIds);
      }

      // Reload to show updates
      await loadDashboardData();
    } catch (err) {
      setError(`Failed to auto-assign PRs: ${err}`);
      console.error(err);
    } finally {
      setAutoAssigning(false);
    }
  };

  /**
   * Refresh data
   */
  const handleRefresh = async () => {
    await loadDashboardData();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading PR dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🏎️ PR Review Orchestration</h1>
        <p>Smart reviewer assignment • SLA tracking • Team metrics</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <button
          className="btn btn-primary"
          onClick={handleAutoAssignAll}
          disabled={autoAssigning || prs.filter((p) => p.reviewers.length === 0).length === 0}
        >
          {autoAssigning ? '⏳ Assigning...' : '⚡ Auto-Assign Unreviewed PRs'}
        </button>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
          🔄 Refresh
        </button>
        <span className="pr-count">
          {prs.length} Open PR{prs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Metrics Summary */}
      {metrics && <MetricsPanel metrics={metrics} />}

      {/* SLA Alerts */}
      {metrics && <SLAAlerts prs={prs} metricsService={metricsService} />}

      {/* Main Content Area */}
      <div className="dashboard-grid">
        {/* PR Table */}
        <div className="pr-section">
          <h2>Pull Requests</h2>
          <PRTable
            prs={prs}
            selectedPR={selectedPR}
            onSelectPR={setSelectedPR}
            metricsService={metricsService}
          />
        </div>

        {/* Reviewer Assignment Panel */}
        {selectedPR && recommendation && (
          <div className="assignment-section">
            <ReviewerAssignmentPanel
              pr={selectedPR}
              recommendation={recommendation}
              onAssign={(reviewerIds) => handleAssignReviewers(selectedPR, reviewerIds)}
              isLoading={autoAssigning}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;