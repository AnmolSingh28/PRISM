import React from "react";
import { MetricsService } from "../services/metricService";
import { TeamMetrics } from "../types";

interface MetricsPanelProps {
  metrics: TeamMetrics;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  return (
    <div className="metrics-panel">
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>📊 Avg Cycle Time</h4>
          <p className="metric-value">{metrics.avgCycleTimeHours}h</p>
          <p className="metric-label">Industry avg: 120h</p>
        </div>

        <div className="metric-card">
          <h4>📈 Open PRs</h4>
          <p className="metric-value">{metrics.openPRs}</p>
          <p className="metric-label">This week: {metrics.mergedThisWeek} merged</p>
        </div>

        <div className="metric-card">
          <h4>⚠️ At Risk</h4>
          <p className="metric-value">{metrics.prsStuckOver24h.length}</p>
          <p className="metric-label">Overdue &gt; 24h</p>
        </div>

        <div className="metric-card">
          <h4>🔥 Critical</h4>
          <p className="metric-value">{metrics.prsStuckOver48h.length}</p>
          <p className="metric-label">Overdue &gt; 48h</p>
        </div>

        <div className="metric-card">
          <h4>💪 Team Capacity</h4>
          <p className="metric-value">
            {Math.round(
              (metrics.reviewerWorkload.reduce((sum, w) => sum + w.utilization, 0) /
                metrics.reviewerWorkload.length) ||
                0
            )}%
          </p>
          <p className="metric-label">Average utilization</p>
        </div>

        <div className="metric-card">
          <h4>🎯 Approval Rate</h4>
          <p className="metric-value">
            {metrics.mergedPRs > 0
              ? Math.round((metrics.mergedPRs / (metrics.mergedPRs + metrics.reviewsRejectsCount)) * 100)
              : 0}
            %
          </p>
          <p className="metric-label">Of reviewed PRs</p>
        </div>
      </div>
    </div>
  );
};