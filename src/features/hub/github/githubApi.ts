import axios from 'axios';

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string;
  private: boolean;
  html_url: string;
  updated_at: string;
}

export const githubApi = {
  async getAuthUrl() {
    const res = await axios.get('/api/github/auth-url');
    return res.data.url;
  },

  async getRepos(token: string) {
    const res = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: { Authorization: `token ${token}` }
    });
    return res.data as GithubRepo[];
  },

  async getUser(token: string) {
    const res = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` }
    });
    return res.data;
  },

  async pushFile(token: string, owner: string, repo: string, path: string, content: string, message: string) {
    const res = await axios.post('/api/github/push', {
      token,
      owner,
      repo,
      path,
      content, // Base64
      message
    });
    return res.data;
  },

  async pushFilesBatch(token: string, owner: string, repo: string, files: { path: string, content: string }[], message: string) {
    const res = await axios.post('/api/github/push-batch', {
      token,
      owner,
      repo,
      files,
      message
    });
    return res.data;
  }
};
