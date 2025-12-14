import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Storage service that uses FileSystem on mobile and localStorage on web
class StorageService {
  private async getFilePath(key: string): Promise<string> {
    return `${FileSystem.documentDirectory}${key}.json`;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } else {
        // Use FileSystem on mobile
        const filePath = await this.getFilePath(key);
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          return content;
        }
        return null;
      }
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } else {
        // Use FileSystem on mobile
        const filePath = await this.getFilePath(key);
        await FileSystem.writeAsStringAsync(filePath, value);
      }
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        // Use FileSystem on mobile
        const filePath = await this.getFilePath(key);
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath);
        }
      }
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  }
}

export const storage = new StorageService();
