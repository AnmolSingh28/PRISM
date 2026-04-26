export interface Developer{
    id:string;
    username:string;
    displayName:string;
    avatar?:string;
    email:string;
    expertise: string[];
    activeReviews:number;
    totalReviewsCompleted:number;
    avgReviewTimeHours:number;
    availability:'available'|'busy'|'offline'|'on-leave';
    isBot?:boolean;
    lastActiveAt:Date;
    
}
export interface PullRequest{
    id:string;
    uuid:string;
    title:string;
    description:string;
    author:Developer;
    repository:string;
    repositoryId:string;
    sourceRepo:string;
    targetRepo:string;
    status:'OPEN'|'MERGED'|'DECLINED'|'SUPERSEDED';
    reviewers:Reviewer[];
    approvals:number;
    requiresApprovals:number;
    filesChanged:number;
    linesAdded:number;
    linesRemoved:number;
    riskLevel:'low'|'medium'|'high'|'critical';
    createdAt:Date;
    updatedAt:Date;
    mergedAt?:Date;
    contextSummary?:string;
    autoAssignedAt?:Date;
    slaStatus?:SLAStatus;
    tags?:string[];
}
export interface Reviewer{
    reviewer:Developer;
    status:'Approved'|'REQUESTED'|'Needs Changes'|'Pending';
    reviewedAt?:Date;
    comments?:number;
}
export interface SLAStatus{
    status:'on-track'|'at-risk'|'violated';
    hoursInReview:number;
    threshold:number;
    urgency:'low'|'medium'|'high'|'critical';
    minutesOverdue?:number;
}
export interface AssignmentScore{
    reviewer:Developer;
    score:number;
    breakdown:{
        availability:number;
        expertise:number;
        workload:number;
        responseTime:number;
    };
    reasons: string[];
}
export interface ReviewerHistory{
    reviewerId:string;
    totalReviewsCompleted:number;
    totalHoursSpent:number;
    avgReviewTimeHours:number;
    lastReviewDate:Date;
    filesReviewedByType:{
        [fileType:string]:number;
    };
}
export interface TeamMetrics{
    totalPRs:number;
    openPRs:number;
    mergedPRs:number;
    avgCycleTimeHours:number;
    medianCycleTimeHours:number;
    prsStuckOver24h:PullRequest[];
    prsStuckOver48h:PullRequest[];
    reviewerWorkload:{
        reviewer:Developer;
        activeReviews:number;
        capacity:number;
        utilization:number;
    }[];
    mergedThisWeek:number;
    mergedThisMonth:number;
    avgApprovalsRequired:number;
    autoApprovedCount:number;
    reviewsRejectsCount:number;
}
export interface ContextSnapshot{
    prId:string;
    title:string;
    businessImpact:string;
    whatChanged:string[];
    why:string;
    riskFactors:string[];
    relatedIssues?:string[];
    generatedAt:Date;
}
export interface AssignmentRecommendation{
    pr:PullRequest;
    recommended:AssignmentScore[];
    reasoning:string;
    confidence:number;
    alternativeOptions?:AssignmentScore[];
}
export interface AppSettings {
  slaThresholdHours: number; 
  minApprovalsRequired: number; 
  autoApproveRules: {
    documentation: boolean;
    dependencyUpdates: boolean;
    configOnly: boolean;
  };
  notificationSettings: {
    slackEnabled: boolean;
    emailEnabled: boolean;
    alertThresholds: {
      at12Hours: boolean;
      at24Hours: boolean;
    };
  };
}
export interface DashboardState {
  prs: PullRequest[];
  developers: Developer[];
  metrics: TeamMetrics;
  selectedPR?: PullRequest;
  filters: {
    status: string[];
    riskLevel: string[];
    assignee?: string;
  };
  loading: boolean;
  error?: string;
}
export interface ApiResponse<T> {
  data: T;
  status: number;
  timestamp: Date;
  error?: string;
}

export interface StorageRecord {
  key: string;
  value: string;
  timestamp: Date;
}