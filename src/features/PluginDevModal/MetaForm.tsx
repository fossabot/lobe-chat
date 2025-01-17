import { Form, FormItemProps, Input } from '@lobehub/ui';
import { FormInstance } from 'antd';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import EmojiPicker from '@/components/EmojiPicker';
import { pluginSelectors, usePluginStore } from '@/store/plugin';

const MetaForm = memo<{ form: FormInstance }>(({ form }) => {
  const { t } = useTranslation('plugin');
  const [plugins] = usePluginStore((s) => [pluginSelectors.pluginList(s).map((i) => i.identifier)]);

  useEffect(() => {
    if (usePluginStore.getState().newDevPlugin) {
      form.setFieldsValue(usePluginStore.getState().newDevPlugin);
    }
  }, []);

  const configItem: FormItemProps[] = [
    {
      children: <Input placeholder={'searchEngine'} />,
      desc: t('dev.meta.identifier.desc'),
      label: t('dev.meta.identifier.label'),
      name: 'identifier',
      rules: [
        { required: true },
        {
          message: t('dev.meta.identifier.pattenErrorMessage'),
          pattern: /^[\w-]+$/,
        },
        {
          message: t('dev.meta.identifier.errorDuplicate'),
          validator: async (_, value) => {
            if (plugins.includes(value)) {
              throw new Error('Duplicate');
            }
          },
        },
      ],
    },
    {
      children: <Input placeholder={t('dev.meta.title.placeholder')} />,
      desc: t('dev.meta.title.desc'),
      label: t('dev.meta.title.label'),
      name: ['meta', 'title'],
      rules: [{ required: true }],
    },
    {
      children: <Input placeholder={t('dev.meta.description.placeholder')} />,
      desc: t('dev.meta.description.desc'),
      label: t('dev.meta.description.label'),
      name: ['meta', 'description'],
    },
    {
      children: <Input placeholder={'LobeHub'} />,
      desc: t('dev.meta.author.desc'),
      label: t('dev.meta.author.label'),
      name: 'author',
    },
    {
      children: <Input placeholder={'https://www.lobehub.com'} />,
      desc: t('dev.meta.homepage.desc'),
      label: t('dev.meta.homepage.label'),
      name: 'homepage',
    },
    {
      children: <EmojiPicker defaultAvatar={'🧩'} />,
      desc: t('dev.meta.avatar.desc'),
      label: t('dev.meta.avatar.label'),
      name: ['meta', 'avatar'],
    },
  ];

  return (
    <Form
      form={form}
      items={[
        {
          children: configItem,
          title: t('dev.metaConfig'),
        },
      ]}
      validateMessages={{
        required: () => t('dev.meta.formFieldRequired'),
      }}
    />
  );
});

export default MetaForm;
