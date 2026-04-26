import { Developer, PullRequest, Reviewer } from "../types";

export class BitbucketService {
  private apiBaseUrl = 'https://api.bitbucket.org/2.0';
  private accessToken: string = ''; // Will be set by Forge auth

  
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  
  async fetchOpenPRs(workspace: string, repoSlug: string): Promise<PullRequest[]> {
    try {
      const url = `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/pullrequests`;
      const params = new URLSearchParams({
        state: 'OPEN',
        pagelen: '50',
      });

      const response = await fetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PRs: ${response.statusText}`);
      }

      const data = await response.json();
      return this.mapBitbucketPRs(data.values || [], workspace, repoSlug);
    } catch (error) {
      console.error('Error fetching PRs:', error);
      return [];
    }
  }

 
  async fetchPRDetails(
    workspace: string,
    repoSlug: string,
    prId: string
  ): Promise<PullRequest | null> {
    try {
      const url = `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PR: ${response.statusText}`);
      }

      const data = await response.json();
      return this.mapBitbucketPR(data, workspace, repoSlug);
    } catch (error) {
      console.error('Error fetching PR details:', error);
      return null;
    }
  }

  async getPRReviewers(
    workspace: string,
    repoSlug: string,
    prId: string
  ): Promise<Reviewer[]> {
    try {
      const pr = await this.fetchPRDetails(workspace, repoSlug, prId);
      return pr?.reviewers || [];
    } catch (error) {
      console.error('Error fetching reviewers:', error);
      return [];
    }
  }

  
  async assignReviewer(
    workspace: string,
    repoSlug: string,
    prId: string,
    reviewerId: string
  ): Promise<boolean> {
    try {
      const url = `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/reviewers/${reviewerId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Error assigning reviewer:', error);
      return false;
    }
  }

  
  async removeReviewer(
    workspace: string,
    repoSlug: string,
    prId: string,
    reviewerId: string
  ): Promise<boolean> {
    try {
      const url = `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/reviewers/${reviewerId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Error removing reviewer:', error);
      return false;
    }
  }


  async approvePR(
    workspace: string,
    repoSlug: string,
    prId: string
  ): Promise<boolean> {
    try {
      const url = `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/approve`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Error approving PR:', error);
      return false;
    }
  }
  async getTeamMembers(workspace: string): Promise<Developer[]> {
    try {
      const url = `${this.apiBaseUrl}/workspaces/${workspace}/members`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch team members: ${response.statusText}`);
      }

      const data = await response.json();
      return this.mapBitbucketMembers(data.values || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }

  async getRecentCommits(
    workspace: string,
    repoSlug: string,
    userId: string,
    limit: number = 20
  ): Promise<string[]> {
    try {
      const url = `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/commits`;
      const params = new URLSearchParams({
        pagelen: limit.toString(),
      });

      const response = await fetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const commits = data.values || [];

      const fileTypes = new Set<string>();
      commits.forEach((commit: any) => {
        if (commit.author?.user?.username === userId) {
          if (commit.message) {
            this.extractExpertiseFromMessage(commit.message, fileTypes);
          }
        }
      });

      return Array.from(fileTypes);
    } catch (error) {
      console.error('Error fetching commits:', error);
      return [];
    }
  }

  
  private mapBitbucketPR(data: any, workspace: string, repoSlug: string): PullRequest {
    const reviewers = (data.reviewers || []).map((reviewer: any) => ({
      reviewer: this.mapBitbucketUser(reviewer.user),
      status: reviewer.status || 'PENDING',
      reviewedAt: reviewer.reviewed_on ? new Date(reviewer.reviewed_on) : undefined,
      comments: reviewer.comments_count || 0,
    }));

    return {
      id: data.id.toString(),
      uuid: data.id.toString(),
      title: data.title,
      description: data.description || '',
      author: this.mapBitbucketUser(data.author),
      repository: repoSlug,
      repositoryId: data.source.repository.uuid,
      sourceRepo: `${data.source.branch.name}`,
      targetRepo: `${data.destination.branch.name}`,
      status: data.state.toUpperCase(),
      reviewers,
      approvals: reviewers.filter((r: any) => r.status === 'APPROVED').length,
      requiresApprovals: 2, // Default requirement
      filesChanged: data.diff_stat?.files_changed || 0,
      linesAdded: data.diff_stat?.lines_added || 0,
      linesRemoved: data.diff_stat?.lines_removed || 0,
      riskLevel: this.assessRiskLevel(data),
      createdAt: new Date(data.created_on),
      updatedAt: new Date(data.updated_on),
      mergedAt: data.merge_commit ? new Date(data.updated_on) : undefined,
    };
  }


  private mapBitbucketPRs(
    prs: any[],
    workspace: string,
    repoSlug: string
  ): PullRequest[] {
    return prs.map((pr) => this.mapBitbucketPR(pr, workspace, repoSlug));
  }

 
  private mapBitbucketUser(user: any): Developer {
    return {
      id: user.username || user.uuid,
      username: user.username || 'unknown',
      email: user.email || '',
      displayName: user.display_name || user.username || 'Unknown',
      avatar: user.links?.avatar?.href,
      expertise: [], // Will be populated separately
      activeReviews: 0, // Will be calculated
      totalReviewsCompleted: 0,
      avgReviewTimeHours: 0,
      availability: 'available',
      lastActiveAt: new Date(),
      isBot: user.type === 'bot',
    };
  }

  
  private mapBitbucketMembers(members: any[]): Developer[] {
    return members.map((member) => this.mapBitbucketUser(member.user));
  }

  
  private assessRiskLevel(
    data: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    let risk = 0;

    //Large PRs are riskier
    const filesChanged = data.diff_stat?.files_changed || 0;
    const linesAdded = data.diff_stat?.lines_added || 0;

    if (filesChanged > 50) risk += 2;
    if (filesChanged > 20) risk += 1;
    if (linesAdded > 1000) risk += 2;
    if (linesAdded > 500) risk += 1;

    //Keywords indicating risk
    const title = (data.title || '').toLowerCase();
    const description = (data.description || '').toLowerCase();
    const content = `${title} ${description}`;

    if (
      content.includes('payment') ||
      content.includes('auth') ||
      content.includes('security')
    ) {
      risk += 3;
    }

    if (risk <= 1) return 'low';
    if (risk <= 3) return 'medium';
    if (risk <= 5) return 'high';
    return 'critical';
  }

 
  private extractExpertiseFromMessage(message: string, fileTypes: Set<string>): void {
    const keywords: { [key: string]: string } = {
      payment: 'payment',
      billing: 'payment',
      auth: 'auth',
      login: 'auth',
      api: 'backend',
      service: 'backend',
      database: 'database',
      sql: 'database',
      react: 'frontend',
      component: 'frontend',
      ui: 'frontend',
      security: 'security',
      test: 'testing',
      deploy: 'devops',
    };

    Object.entries(keywords).forEach(([keyword, type]) => {
      if (message.toLowerCase().includes(keyword)) {
        fileTypes.add(type);
      }
    });
  }

 
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: this.accessToken ? `Bearer ${this.accessToken}` : '',
    };
  }
}