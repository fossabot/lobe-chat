import { merge } from 'lodash-es';
import { ChatCompletionFunctions } from 'openai-edge/types/api';

import { LOBE_CHAT_ACCESS_CODE, OPENAI_API_KEY_HEADER_KEY, OPENAI_END_POINT } from '@/const/fetch';
import { useGlobalStore } from '@/store/global';
import { pluginSelectors, usePluginStore } from '@/store/plugin';
import { initialLobeAgentConfig } from '@/store/session/initialState';
import type { OpenAIStreamPayload } from '@/types/openai';

import { URLS } from './url';

interface FetchChatModelOptions {
  signal?: AbortSignal | undefined;
}

/**
 * 专门用于对话的 fetch
 */
export const fetchChatModel = (
  { plugins: enabledPlugins, ...params }: Partial<OpenAIStreamPayload>,
  options?: FetchChatModelOptions,
) => {
  const payload = merge(
    {
      model: initialLobeAgentConfig.model,
      stream: true,
      ...initialLobeAgentConfig.params,
    },
    params,
  );
  // ============  1. 前置处理 functions   ============ //

  const filterFunctions: ChatCompletionFunctions[] = pluginSelectors.enabledSchema(enabledPlugins)(
    usePluginStore.getState(),
  );

  const functions = filterFunctions.length === 0 ? undefined : filterFunctions;

  return fetch(URLS.openai, {
    body: JSON.stringify({ ...payload, functions }),
    headers: {
      'Content-Type': 'application/json',
      [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings.password || '',
      [OPENAI_API_KEY_HEADER_KEY]: useGlobalStore.getState().settings.OPENAI_API_KEY || '',
      [OPENAI_END_POINT]: useGlobalStore.getState().settings.endpoint || '',
    },
    method: 'POST',
    signal: options?.signal,
  });
};
