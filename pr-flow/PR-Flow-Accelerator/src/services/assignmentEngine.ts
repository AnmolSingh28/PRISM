import{
    Developer,
    PullRequest,
    AssignmentScore,
    ReviewerHistory,
    AssignmentRecommendation,
} from '../types';
export class ReviewerAssignmentEngine {
  private reviewerHistory: Map<string, ReviewerHistory> = new Map();

 
  async getBestReviewers(
    pr: PullRequest,
    availableDevelopers: Developer[],
    count: number = 2
  ): Promise<AssignmentRecommendation> {
   
    const eligibleDevs = availableDevelopers.filter(
      (dev) => dev.id !== pr.author.id
    );

    const scoredReviewers = eligibleDevs.map((dev) =>
      this.scoreReviewer(pr, dev)
    );

  
    const sorted = scoredReviewers.sort((a, b) => b.score - a.score);

    const recommended = sorted.slice(0, count);
    const alternatives = sorted.slice(count, Math.min(count + 2, sorted.length));

    const reasoning = this.generateReasoning(pr, recommended[0]);
    const confidence = this.calculateConfidence(recommended);

    return {
      pr,
      recommended,
      reasoning,
      confidence,
      alternativeOptions: alternatives,
    };
  }

  
  private scoreReviewer(pr: PullRequest, developer: Developer): AssignmentScore {
    const breakdown = {
      availability: this.scoreAvailability(developer),
      expertise: this.scoreExpertise(pr, developer),
      workload: this.scoreWorkload(developer),
      responseTime: this.scoreResponseTime(developer),
    };

    const totalScore =
      breakdown.availability +
      breakdown.expertise +
      breakdown.workload +
      breakdown.responseTime;

    const reasons = this.generateScoreReasons(developer, breakdown);

    return {
      reviewer: developer,
      score: totalScore,
      breakdown,
      reasons,
    };
  }

  
  private scoreAvailability(developer: Developer): number {
    const scores: { [key: string]: number } = {
      available: 30,
      busy: 10,
      offline: 0,
      'on-leave': -999, 
    };

    return scores[developer.availability] || 0;
  }

 
  private scoreExpertise(pr: PullRequest, developer: Developer): number {
    
    const prFileTypes = this.extractFileTypes(pr);

    const matchingExpertise = developer.expertise.filter((exp) =>
      prFileTypes.some((ft) => this.isSimilarExpertise(exp, ft))
    );

    if (matchingExpertise.length === 0) {
      return 5; 
    }

    const matchPercentage = matchingExpertise.length / prFileTypes.length;
    return Math.floor(matchPercentage * 40);
  }

  
  private scoreWorkload(developer: Developer): number {
    const maxReviewsPerDev = 5; 
    const utilization = developer.activeReviews / maxReviewsPerDev;

    if (utilization > 1) {
      return 0; 
    }

    return Math.floor((1 - utilization) * 20);
  }

 
  private scoreResponseTime(developer: Developer): number {
    const avgTimeHours = developer.avgReviewTimeHours;

    if (avgTimeHours === 0) {
      return 10; 
    }

    if (avgTimeHours <= 4) return 10;
    if (avgTimeHours <= 8) return 8;
    if (avgTimeHours <= 16) return 5;
    if (avgTimeHours <= 24) return 2;
    return 0; 
  }

 
  private extractFileTypes(pr: PullRequest): string[] {
   
    const keywords = pr.description.toLowerCase();

    const types: string[] = [];
    if (keywords.includes('payment') || keywords.includes('billing'))
      types.push('payment');
    if (keywords.includes('auth') || keywords.includes('login'))
      types.push('auth');
    if (
      keywords.includes('ui') ||
      keywords.includes('component') ||
      keywords.includes('react')
    )
      types.push('frontend');
    if (keywords.includes('api') || keywords.includes('service'))
      types.push('backend');
    if (keywords.includes('database') || keywords.includes('sql'))
      types.push('database');

    return types.length > 0 ? types : ['general'];
  }

 
  private isSimilarExpertise(exp1: string, exp2: string): boolean {
    const normalize = (s: string) => s.toLowerCase().trim();
    return (
      normalize(exp1) === normalize(exp2) ||
      normalize(exp1).includes(normalize(exp2)) ||
      normalize(exp2).includes(normalize(exp1))
    );
  }

  
  private generateScoreReasons(
    developer: Developer,
    breakdown: any
  ): string[] {
    const reasons: string[] = [];

    if (breakdown.availability >= 25)
      reasons.push(`${developer.displayName} is currently available`);
    if (breakdown.expertise >= 30)
      reasons.push(`Strong expertise match for this code`);
    if (breakdown.workload >= 15)
      reasons.push(`Low workload, can prioritize this PR`);
    if (breakdown.responseTime >= 8)
      reasons.push(`Typically reviews quickly (${developer.avgReviewTimeHours}h avg)`);

    return reasons;
  }

  private generateReasoning(
    pr: PullRequest,
    topScore: AssignmentScore
  ): string {
    return `${topScore.reviewer.displayName} is the best fit (score: ${topScore.score}/100) - ${topScore.reasons.join('; ')}`;
  }

  
  private calculateConfidence(scores: AssignmentScore[]): number {
    if (scores.length === 0) return 0;

    const topScore = scores[0].score;
    const bottomScore = scores[scores.length - 1].score;
    const spread = topScore - bottomScore;

    return Math.min(100, Math.floor((spread / 100) * 100 + 50));
  }

  
  assessRisk(pr: PullRequest): 'low' | 'medium' | 'high' | 'critical' {
    let risk = 0;

    
    if (pr.filesChanged > 20) risk += 2;
    if (pr.filesChanged > 50) risk += 2;

    
    if (pr.linesAdded + pr.linesRemoved > 500) risk += 2;

    
    if (
      pr.description.includes('payment') ||
      pr.description.includes('auth') ||
      pr.description.includes('security')
    ) {
      risk += 3;
    }

    if (risk <= 2) return 'low';
    if (risk <= 4) return 'medium';
    if (risk <= 6) return 'high';
    return 'critical';
  }

  
  canAutoApprove(pr: PullRequest): boolean {
   
    const risk = this.assessRisk(pr);
    if (risk !== 'low') return false;

    if (pr.description.includes('docs') && pr.filesChanged <= 5) return true;
    if (pr.description.includes('dependency') && pr.filesChanged <= 3)
      return true;
    if (pr.description.includes('config') && pr.filesChanged <= 2) return true;

    return false;
  }

 
  updateHistory(
    reviewerId: string,
    reviewTimeHours: number,
    filesReviewedType: string
  ): void {
    const history = this.reviewerHistory.get(reviewerId) || {
      reviewerId,
      totalReviewsCompleted: 0,
      totalHoursSpent: 0,
      avgReviewTimeHours: 0,
      lastReviewDate: new Date(),
      filesReviewedByType: {},
    };

    history.totalReviewsCompleted += 1;
    history.totalHoursSpent += reviewTimeHours;
    history.avgReviewTimeHours =
      history.totalHoursSpent / history.totalReviewsCompleted;
    history.lastReviewDate = new Date();
    history.filesReviewedByType[filesReviewedType] =
      (history.filesReviewedByType[filesReviewedType] || 0) + 1;

    this.reviewerHistory.set(reviewerId, history);
  }
}