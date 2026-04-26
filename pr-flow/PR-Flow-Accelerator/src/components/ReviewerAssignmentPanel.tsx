import React from "react";
import { MetricsService } from "../services/metricService";
import { AssignmentRecommendation, PullRequest } from "../types";

interface ReviewerAssignmentPanelProps {
  pr: PullRequest;
  recommendation: AssignmentRecommendation;
  onAssign: (reviewerIds: string[]) => Promise<void>;
  isLoading: boolean;
}

export const ReviewerAssignmentPanel: React.FC<ReviewerAssignmentPanelProps> = ({
  pr,
  recommendation,
  onAssign,
  isLoading,
}) => {
  const [selectedReviewers, setSelectedReviewers] = React.useState<string[]>(
    recommendation.recommended.map((r) => r.reviewer.id)
  );

  const handleAssign = async () => {
    await onAssign(selectedReviewers);
  };

  return (
    <div className="reviewer-assignment-panel">
      <h3>🎯 Recommended Reviewers</h3>
      <p className="confidence">
        Confidence: {recommendation.confidence}% - {recommendation.reasoning}
      </p>

      <div className="recommended-reviewers">
        {recommendation.recommended.map((score, idx) => (
          <div key={score.reviewer.id} className="reviewer-card">
            <div className="reviewer-header">
              <img src={score.reviewer.avatar || '/default-avatar.png'} alt="" />
              <div>
                <h4>{score.reviewer.displayName}</h4>
                <p>Score: {score.score}/100</p>
              </div>
            </div>

            <div className="score-breakdown">
              <div className="score-item">
                <span>Availability:</span>
                <div className="score-bar" style={{ width: `${(score.breakdown.availability / 30) * 100}%` }} />
              </div>
              <div className="score-item">
                <span>Expertise:</span>
                <div className="score-bar" style={{ width: `${(score.breakdown.expertise / 40) * 100}%` }} />
              </div>
              <div className="score-item">
                <span>Workload:</span>
                <div className="score-bar" style={{ width: `${(score.breakdown.workload / 20) * 100}%` }} />
              </div>
              <div className="score-item">
                <span>Response Time:</span>
                <div className="score-bar" style={{ width: `${(score.breakdown.responseTime / 10) * 100}%` }} />
              </div>
            </div>

            <ul className="reasons">
              {score.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={selectedReviewers.includes(score.reviewer.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedReviewers([...selectedReviewers, score.reviewer.id]);
                  } else {
                    setSelectedReviewers(selectedReviewers.filter((id) => id !== score.reviewer.id));
                  }
                }}
              />
              {idx === 0 ? 'Primary Reviewer' : 'Secondary Reviewer'}
            </label>
          </div>
        ))}
      </div>

      <button
        className="btn btn-success"
        onClick={handleAssign}
        disabled={isLoading || selectedReviewers.length === 0}
      >
        {isLoading ? '⏳ Assigning...' : `✅ Assign ${selectedReviewers.length} Reviewer(s)`}
      </button>
    </div>
  );
};