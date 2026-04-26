import React from "react";
import { MetricsService } from "../services/metricService";
import { PullRequest } from "../types";

interface PRTableProps {
  prs: PullRequest[];
  selectedPR?: PullRequest | null;
  onSelectPR: (pr: PullRequest) => void;
  metricsService: MetricsService;
}

export const PRTable: React.FC<PRTableProps> = ({
  prs,
  selectedPR,
  onSelectPR,
  metricsService,
}) => {
  const getRiskBadge = (risk: string) => {
    const colors: { [key: string]: string } = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545',
    };
    return `<span style="background: ${colors[risk] || '#999'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${risk.toUpperCase()}</span>`;
  };

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      OPEN: '#0066cc',
      MERGED: '#28a745',
      DECLINED: '#dc3545',
    };
    return `<span style="background: ${colors[status] || '#999'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${status}</span>`;
  };

  return (
    <div className="pr-table-container">
      <table className="pr-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Status</th>
            <th>Risk</th>
            <th>Reviewers</th>
            <th>Time</th>
            <th>SLA</th>
          </tr>
        </thead>
        <tbody>
          {prs.map((pr) => {
            const sla = metricsService.calculateSLAStatus(pr);
            const isSelected = selectedPR?.id === pr.id;

            return (
              <tr
                key={pr.id}
                className={`pr-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectPR(pr)}
                style={{ cursor: 'pointer' }}
              >
                <td className="pr-title">{pr.title}</td>
                <td>{pr.author.displayName}</td>
                <td dangerouslySetInnerHTML={{ __html: getStatusBadge(pr.status) }} />
                <td dangerouslySetInnerHTML={{ __html: getRiskBadge(pr.riskLevel) }} />
                <td className="reviewers">
                  {pr.reviewers.length > 0 ? (
                    <div className="reviewer-avatars">
                      {pr.reviewers.map((r) => (
                        <img
                          key={r.reviewer.id}
                          src={r.reviewer.avatar || '/default-avatar.png'}
                          alt={r.reviewer.displayName}
                          title={r.reviewer.displayName}
                          className="reviewer-avatar"
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="no-reviewers">Unassigned</span>
                  )}
                </td>
                <td className="time">{Math.round((Date.now() - pr.createdAt.getTime()) / (1000 * 60 * 60))}h</td>
                <td>
                  <span className={`sla-status sla-${sla.status}`}>
                    {sla.urgency.toUpperCase()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};