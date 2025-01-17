import {
  LobeChatPluginManifest,
  LobeChatPluginsMarketIndex,
  pluginManifestSchema,
} from '@lobehub/chat-plugin-sdk';
import { message } from 'antd';
import { produce } from 'immer';
import { merge, uniq } from 'lodash-es';
import useSWR, { SWRResponse } from 'swr';
import { StateCreator } from 'zustand/vanilla';

import { getPluginList } from '@/services/pluginMarket';
import { pluginSelectors } from '@/store/plugin/selectors';
import { LobeSessions } from '@/types/session';
import { setNamespace } from '@/utils/storeDebug';

import { DevPlugin, defaultDevPlugin } from './initialState';
import { DevListDispatch, devPluginListReducer } from './reducers/devPluginList';
import { PluginDispatch, pluginManifestReducer } from './reducers/manifest';
import { PluginStore } from './store';

const t = setNamespace('plugin');

/**
 * 代理行为接口
 */
export interface PluginAction {
  checkLocalEnabledPlugins: (sessions: LobeSessions) => void;
  dispatchDevPluginList: (payload: DevListDispatch) => void;
  dispatchPluginManifest: (payload: PluginDispatch) => void;
  fetchPluginManifest: (name: string) => Promise<void>;
  saveToDevList: (value: DevPlugin) => void;
  updateManifestLoadingState: (key: string, value: boolean | undefined) => void;
  updateNewDevPlugin: (value: Partial<DevPlugin>) => void;
  updatePluginSettings: <T>(id: string, settings: Partial<T>) => void;
  useFetchPluginList: () => SWRResponse<LobeChatPluginsMarketIndex>;
}

export const createPluginSlice: StateCreator<
  PluginStore,
  [['zustand/devtools', never]],
  [],
  PluginAction
> = (set, get) => ({
  checkLocalEnabledPlugins: async (sessions) => {
    const { fetchPluginManifest } = get();

    let enabledPlugins: string[] = [];

    for (const session of Object.values(sessions)) {
      const plugins = session.config.plugins;
      if (!plugins || plugins.length === 0) continue;

      enabledPlugins = [...enabledPlugins, ...plugins];
    }

    const plugins = uniq(enabledPlugins);

    await Promise.all(plugins.map((name) => fetchPluginManifest(name)));

    set({ manifestPrepared: true }, false, t('checkLocalEnabledPlugins'));
  },
  dispatchDevPluginList: (payload) => {
    const { devPluginList } = get();

    const nextList = devPluginListReducer(devPluginList, payload);
    set({ devPluginList: nextList }, false, t('dispatchDevList', payload));
  },
  dispatchPluginManifest: (payload) => {
    const { pluginManifestMap } = get();
    const nextManifest = pluginManifestReducer(pluginManifestMap, payload);

    set({ pluginManifestMap: nextManifest }, false, t('dispatchPluginManifest', payload));
  },
  fetchPluginManifest: async (name) => {
    const plugin = pluginSelectors.getPluginMetaById(name)(get());
    // 1. 校验文件

    if (!plugin) return;

    if (!plugin.manifest) {
      message.error('插件未配置 描述文件');
      return;
    }

    // 2. 发送请求
    get().updateManifestLoadingState(name, true);
    let data: LobeChatPluginManifest | null;

    try {
      const res = await fetch(plugin.manifest);

      data = await res.json();
    } catch (error) {
      data = null;
      console.error(error);
    }

    get().updateManifestLoadingState(name, undefined);
    if (!data) {
      message.error('插件描述文件请求失败');
      return;
    }

    // 3. 校验插件文件格式规范
    const { success } = pluginManifestSchema.safeParse(data);

    if (!success) {
      message.error('插件描述文件格式错误');
      return;
    }

    // 4. 存储 manifest 信息
    get().dispatchPluginManifest({ id: plugin.identifier, plugin: data, type: 'addManifest' });
  },
  saveToDevList: (value) => {
    get().dispatchDevPluginList({ plugin: value, type: 'addItem' });
    set({ newDevPlugin: defaultDevPlugin }, false, t('saveToDevList'));
  },

  updateManifestLoadingState: (key, value) => {
    set(
      produce((draft) => {
        draft.pluginManifestLoading[key] = value;
      }),
      false,
      t('updateManifestLoadingState'),
    );
  },
  updateNewDevPlugin: (newDevPlugin) => {
    set(
      { newDevPlugin: merge({}, get().newDevPlugin, newDevPlugin) },
      false,
      t('updateNewDevPlugin'),
    );
  },
  updatePluginSettings: (id, settings) => {
    set(
      produce((draft) => {
        draft.pluginsSettings[id] = merge({}, draft.pluginsSettings[id], settings);
      }),
      false,
      t('updatePluginSettings'),
    );
  },

  useFetchPluginList: () =>
    useSWR<LobeChatPluginsMarketIndex>('fetchPluginList', getPluginList, {
      onSuccess: (pluginMarketIndex) => {
        set({ pluginList: pluginMarketIndex.plugins }, false, t('useFetchPluginList'));
      },
    }),
});
