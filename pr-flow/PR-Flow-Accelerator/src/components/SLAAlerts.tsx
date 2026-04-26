import React from "react";
import { MetricsService } from "../services/metricService";
import { PullRequest } from "../types";

interface SLAAlertProps {
  prs: PullRequest[];
  metricsService: MetricsService;
}

export const SLAAlerts: React.FC<SLAAlertProps> = ({ prs, metricsService }) => {
  const bottlenecks = metricsService.getBottlenecks(prs);

  if (bottlenecks.critical.length === 0 && bottlenecks.high.length === 0) {
    return (
      <div className="alert alert-success">
        ✅ All PRs on track! No SLA violations.
      </div>
    );
  }

  return (
    <div className="alerts-container">
      {bottlenecks.critical.length > 0 && (
        <div className="alert alert-critical">
          <h3>🚨 Critical: {bottlenecks.critical.length} PR(s) severely overdue</h3>
          <ul>
            {bottlenecks.critical.map((pr) => (
              <li key={pr.id}>
                <strong>{pr.title}</strong> - Created {Math.round((Date.now() - pr.createdAt.getTime()) / (1000 * 60 * 60))}h ago
              </li>
            ))}
          </ul>
          <p>👉 Escalate to team lead immediately!</p>
        </div>
      )}

      {bottlenecks.high.length > 0 && (
        <div className="alert alert-warning">
          <h3>⚠️ Warning: {bottlenecks.high.length} PR(s) overdue</h3>
          <ul>
            {bottlenecks.high.map((pr) => (
              <li key={pr.id}>{pr.title}</li>
            ))}
          </ul>
        </div>
      )}

      {bottlenecks.medium.length > 0 && (
        <div className="alert alert-info">
          <h3>ℹ️ Note: {bottlenecks.medium.length} PR(s) at-risk</h3>
          <p>Keep an eye on these - nearing SLA threshold</p>
        </div>
      )}
    </div>
  );
};