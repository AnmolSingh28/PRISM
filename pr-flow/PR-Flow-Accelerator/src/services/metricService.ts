import { Developer, PullRequest, SLAStatus, TeamMetrics } from "../types";

export class MetricsService {
  private slaThresholdHours: number = 24; 

  
  setSLAThreshold(hours: number): void {
    this.slaThresholdHours = hours;
  }

  
  calculateSLAStatus(pr: PullRequest): SLAStatus {
    if (pr.status !== 'OPEN') {
      
      return {
        status: 'on-track',
        hoursInReview: 0,
        threshold: this.slaThresholdHours,
        urgency: 'low',
      };
    }

    const hoursInReview = this.getHoursInReview(pr);
    const minutesOverdue = hoursInReview > this.slaThresholdHours
      ? (hoursInReview - this.slaThresholdHours) * 60
      : 0;

    let status: 'on-track' | 'at-risk' | 'violated' = 'on-track';
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (hoursInReview > this.slaThresholdHours * 2) {
      status = 'violated';
      urgency = 'critical';
    } else if (hoursInReview > this.slaThresholdHours) {
      status = 'violated';
      urgency = 'high';
    } else if (hoursInReview > this.slaThresholdHours * 0.75) {
      status = 'at-risk';
      urgency = 'medium';
    } else if (hoursInReview > this.slaThresholdHours * 0.5) {
      status = 'at-risk';
      urgency = 'low';
    }

    return {
      status,
      hoursInReview,
      threshold: this.slaThresholdHours,
      urgency,
      minutesOverdue,
    };
  }

  
  private getHoursInReview(pr: PullRequest): number {
    const now = new Date();
    const created = new Date(pr.createdAt);
    const diffMs = now.getTime() - created.getTime();
    return Math.round(diffMs / (1000 * 60 * 60)); // Convert ms to hours
  }

 
  getBottlenecks(prs: PullRequest[]): {
    allBottlenecks: PullRequest[];
    critical: PullRequest[];
    high: PullRequest[];
    medium: PullRequest[];
  } {
    const allBottlenecks: PullRequest[] = [];
    const critical: PullRequest[] = [];
    const high: PullRequest[] = [];
    const medium: PullRequest[] = [];

    prs.forEach((pr) => {
      if (pr.status === 'OPEN') {
        const sla = this.calculateSLAStatus(pr);
        
        if (sla.status === 'violated') {
          allBottlenecks.push(pr);
          
          if (sla.urgency === 'critical') {
            critical.push(pr);
          } else if (sla.urgency === 'high') {
            high.push(pr);
          }
        } else if (sla.status === 'at-risk') {
          allBottlenecks.push(pr);
          medium.push(pr);
        }
      }
    });

    return {
      allBottlenecks,
      critical,
      high,
      medium,
    };
  }

 
  private calculateCycleTime(pr: PullRequest): number {
    if (!pr.mergedAt) return -1;

    const created = new Date(pr.createdAt);
    const merged = new Date(pr.mergedAt);
    const diffMs = merged.getTime() - created.getTime();
    return Math.round(diffMs / (1000 * 60 * 60)); 
  }

 
  getAverageCycleTime(prs: PullRequest[]): number {
    const mergedPRs = prs.filter((pr) => pr.mergedAt);
    if (mergedPRs.length === 0) return 0;

    const times = mergedPRs.map((pr) => this.calculateCycleTime(pr));
    const sum = times.reduce((a, b) => a + b, 0);
    return Math.round(sum / times.length);
  }


  getMedianCycleTime(prs: PullRequest[]): number {
    const mergedPRs = prs.filter((pr) => pr.mergedAt);
    if (mergedPRs.length === 0) return 0;

    const times = mergedPRs
      .map((pr) => this.calculateCycleTime(pr))
      .sort((a, b) => a - b);

    const mid = Math.floor(times.length / 2);
    return times.length % 2 !== 0 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  }

  /**
   * Analyze reviewer workload
   */
  getReviewerWorkload(
    prs: PullRequest[],
    developers: Developer[]
  ): Array<{ dev: Developer; activeReviews: number; capacity: number; utilization: number }> {
    const maxCapacity = 5; // Max reasonable concurrent reviews

    return developers.map((dev) => {
      const activeReviews = dev.activeReviews;
      const utilization = Math.min(100, (activeReviews / maxCapacity) * 100);

      return {
        dev,
        activeReviews,
        capacity: maxCapacity,
        utilization,
      };
    });
  }

  /**
   * Calculate team metrics
   */
  calculateTeamMetrics(
    prs: PullRequest[],
    developers: Developer[]
  ): TeamMetrics {
    const openPRs = prs.filter((pr) => pr.status === 'OPEN');
    const mergedPRs = prs.filter((pr) => pr.status === 'MERGED');
    const bottlenecks = this.getBottlenecks(prs);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const mergedThisWeek = mergedPRs.filter(
      (pr) => new Date(pr.mergedAt!) >= weekAgo
    ).length;

    const mergedThisMonth = mergedPRs.filter(
      (pr) => new Date(pr.mergedAt!) >= monthAgo
    ).length;

    
    const reviewerWorkload = this.getReviewerWorkload(prs, developers).map((w) => ({
      reviewer: w.dev,
      activeReviews: w.activeReviews,
      capacity: w.capacity,
      utilization: w.utilization,
    }));

    return {
      totalPRs: prs.length,
      openPRs: openPRs.length,
      mergedPRs: mergedPRs.length,
      avgCycleTimeHours: this.getAverageCycleTime(prs),
      medianCycleTimeHours: this.getMedianCycleTime(prs),
      prsStuckOver24h: bottlenecks.high.concat(bottlenecks.critical),
      prsStuckOver48h: bottlenecks.critical,
      reviewerWorkload,
      mergedThisWeek,
      mergedThisMonth,
      avgApprovalsRequired: 2,
      autoApprovedCount: 0, // Track separately
      reviewsRejectsCount: prs.filter((pr) => pr.status === 'DECLINED').length,
    };
  }

 
  generateInsights(metrics: TeamMetrics): string[] {
    const insights: string[] = [];

   
    if (metrics.prsStuckOver24h.length > 0) {
      insights.push(
        `⚠️ ${metrics.prsStuckOver24h.length} PRs stuck over 24 hours! Escalate to team lead.`
      );
    }

    if (metrics.mergedThisWeek < 5 && metrics.openPRs > 10) {
      insights.push(
        `📉 Low merge velocity this week (${metrics.mergedThisWeek}). Consider increasing reviewers.`
      );
    }

    const overloadedReviewers = metrics.reviewerWorkload.filter(
      (w) => w.utilization > 80
    );
    if (overloadedReviewers.length > 0) {
      insights.push(
        `😰 ${overloadedReviewers.length} reviewers are overloaded (>80% capacity). Balance the workload.`
      );
    }

    if (metrics.avgCycleTimeHours > 48) {
      insights.push(
        `🐌 Average cycle time is ${metrics.avgCycleTimeHours}h - target is 24h. Investigate delays.`
      );
    }

    if (
      metrics.prsStuckOver24h.length === 0 &&
      metrics.avgCycleTimeHours <= 24
    ) {
      insights.push(`🎉 All PRs moving smoothly! Team is in great shape.`);
    }

    return insights;
  }


  predictMergeTime(pr: PullRequest, avgCycleTime: number): { estimate: number; confidence: string } {
    const hoursInReview = this.getHoursInReview(pr);
    const estimatedRemaining = avgCycleTime - hoursInReview;

    if (estimatedRemaining <= 0) {
      return {
        estimate: 0,
        confidence: 'Should already be merged',
      };
    }

    if (estimatedRemaining < 4) {
      return {
        estimate: estimatedRemaining,
        confidence: 'Very likely (already in final stages)',
      };
    }

    if (estimatedRemaining < 12) {
      return {
        estimate: estimatedRemaining,
        confidence: 'Likely (normal pace)',
      };
    }

    return {
      estimate: estimatedRemaining,
      confidence: 'Uncertain (may face delays)',
    };
  }
}