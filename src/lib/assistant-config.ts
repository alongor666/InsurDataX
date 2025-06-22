
'use server';

/**
 * @fileOverview Service for fetching and saving the AI assistant's configuration from Firestore.
 * This centralizes the logic for managing the AI's persona and core instructions,
 * allowing for dynamic configuration without code changes.
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Defines the structure for the AI assistant's configuration data.
export interface AssistantConfig {
  persona: string;
  core_principles: string[];
  last_updated?: Date;
}

const CONFIG_COLLECTION = 'ai_assistant_configs';
const CONFIG_DOCUMENT = 'global_settings';

/**
 * Retrieves the AI assistant's configuration from Firestore.
 * @returns {Promise<AssistantConfig>} A promise that resolves to the configuration object.
 * @throws Will throw an error if the configuration document cannot be fetched.
 */
export async function getAssistantConfig(): Promise<AssistantConfig> {
  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      persona: data.persona || '一个通用的AI助手。',
      core_principles: Array.isArray(data.core_principles) ? data.core_principles : [],
      last_updated: data.last_updated?.toDate(),
    };
  } else {
    // If the document doesn't exist, return a default configuration.
    // This ensures the application can function even before the config is first set.
    console.warn(`AI configuration document not found at '${CONFIG_COLLECTION}/${CONFIG_DOCUMENT}'. Returning default config.`);
    return {
      persona: '我是一个AI原型构建助手。请在 /settings 页面定义我的角色和核心原则。',
      core_principles: [
        '以中文进行沟通。',
        '优先考虑代码质量和最佳实践。',
        '确保代码和文档同步。'
      ],
    };
  }
}

/**
 * Saves the AI assistant's configuration to Firestore.
 * @param {Partial<AssistantConfig>} config - The configuration object to save. Can be a partial object.
 * @returns {Promise<void>} A promise that resolves when the save is complete.
 * @throws Will throw an error if the data cannot be written to Firestore.
 */
export async function saveAssistantConfig(config: Partial<AssistantConfig>): Promise<void> {
  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT);
  await setDoc(docRef, {
    ...config,
    last_updated: serverTimestamp(),
  }, { merge: true });
}
