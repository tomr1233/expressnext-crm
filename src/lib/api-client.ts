// Utility for making authenticated API requests
import { CognitoAuthService } from './cognito'

export class ApiClient {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await CognitoAuthService.getAuthSession()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`
    }
    
    return headers
  }

  static async get(url: string): Promise<Response> {
    const headers = await this.getAuthHeaders()
    return fetch(url, {
      method: 'GET',
      headers,
    })
  }

  static async post(url: string, data?: any): Promise<Response> {
    const headers = await this.getAuthHeaders()
    return fetch(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  static async put(url: string, data?: any): Promise<Response> {
    const headers = await this.getAuthHeaders()
    return fetch(url, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  static async delete(url: string): Promise<Response> {
    const headers = await this.getAuthHeaders()
    return fetch(url, {
      method: 'DELETE',
      headers,
    })
  }

  // Handle token refresh on 401 responses
  static async request(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = await this.getAuthHeaders()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })

    // If we get a 401, try to refresh the token and retry once
    if (response.status === 401) {
      const refreshedUser = await CognitoAuthService.refreshUserToken()
      if (refreshedUser) {
        const newHeaders = await this.getAuthHeaders()
        return fetch(url, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        })
      } else {
        // Redirect to login if refresh fails
        if (typeof window !== 'undefined') {
          window.location.href = '/auth'
        }
      }
    }

    return response
  }
}