interface SecureStorageItem {
  value: string
  timestamp: number
  expires?: number
}

class SecureStorage {
  private static isClient = typeof window !== 'undefined'
  
  static setItem(key: string, value: string, expirationMinutes?: number): void {
    if (!this.isClient) return
    
    const item: SecureStorageItem = {
      value,
      timestamp: Date.now(),
      expires: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : undefined
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(item))
    } catch (error) {
      console.error('Failed to store item securely:', error)
    }
  }
  
  static getItem(key: string): string | null {
    if (!this.isClient) return null
    
    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null
      
      const item: SecureStorageItem = JSON.parse(itemStr)
      
      // Check if item has expired
      if (item.expires && Date.now() > item.expires) {
        this.removeItem(key)
        return null
      }
      
      return item.value
    } catch (error) {
      console.error('Failed to retrieve item securely:', error)
      return null
    }
  }
  
  static removeItem(key: string): void {
    if (!this.isClient) return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove item:', error)
    }
  }
  
  static clear(): void {
    if (!this.isClient) return
    
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  }
  
  // Check if an item exists and is not expired
  static hasValidItem(key: string): boolean {
    return this.getItem(key) !== null
  }
  
  // Get remaining time before expiration in minutes
  static getTimeToExpiration(key: string): number | null {
    if (!this.isClient) return null
    
    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null
      
      const item: SecureStorageItem = JSON.parse(itemStr)
      
      if (!item.expires) return null
      
      const remainingMs = item.expires - Date.now()
      return remainingMs > 0 ? Math.floor(remainingMs / (60 * 1000)) : 0
    } catch (error) {
      console.error('Failed to get expiration time:', error)
      return null
    }
  }
}

// Cognito-specific token storage
export class CognitoTokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'cognito_access_token'
  private static readonly REFRESH_TOKEN_KEY = 'cognito_refresh_token'
  private static readonly ID_TOKEN_KEY = 'cognito_id_token'
  
  static setTokens(accessToken: string, refreshToken?: string, idToken?: string): void {
    // Access tokens typically expire in 1 hour, store for 55 minutes to be safe
    SecureStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken, 55)
    
    if (refreshToken) {
      // Refresh tokens can be configured for much longer (30 days is common)
      // Don't set expiration as it should be handled by Cognito
      SecureStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken)
    }
    
    if (idToken) {
      // ID tokens have same expiration as access tokens
      SecureStorage.setItem(this.ID_TOKEN_KEY, idToken, 55)
    }
  }
  
  static getAccessToken(): string | null {
    return SecureStorage.getItem(this.ACCESS_TOKEN_KEY)
  }
  
  static getRefreshToken(): string | null {
    return SecureStorage.getItem(this.REFRESH_TOKEN_KEY)
  }
  
  static getIdToken(): string | null {
    return SecureStorage.getItem(this.ID_TOKEN_KEY)
  }
  
  static clearTokens(): void {
    SecureStorage.removeItem(this.ACCESS_TOKEN_KEY)
    SecureStorage.removeItem(this.REFRESH_TOKEN_KEY)
    SecureStorage.removeItem(this.ID_TOKEN_KEY)
  }
  
  static hasValidAccessToken(): boolean {
    return SecureStorage.hasValidItem(this.ACCESS_TOKEN_KEY)
  }
  
  static hasRefreshToken(): boolean {
    return SecureStorage.hasValidItem(this.REFRESH_TOKEN_KEY)
  }
  
  static getAccessTokenTimeToExpiration(): number | null {
    return SecureStorage.getTimeToExpiration(this.ACCESS_TOKEN_KEY)
  }
  
  // Get all current tokens
  static getTokens(): { accessToken: string | null, refreshToken: string | null, idToken: string | null } {
    return {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken(),
      idToken: this.getIdToken()
    }
  }
}

export default SecureStorage