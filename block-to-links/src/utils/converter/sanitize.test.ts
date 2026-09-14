import { describe, expect, it } from 'vitest';
import {
  sanitizeFieldValuesForCreation,
  sanitizeLocalizedFieldValuesForCreation,
} from './sanitize';

describe('Structured Text creation payloads', () => {
  it.each(['nonlocalized', 'localized'])(
    'removes embedded block IDs from %s fields and preserves references',
    (localization) => {
      const itemType = {
        item_type: { data: { type: 'item_type', id: 'image-type' } },
      };
      const image = {
        upload_id: 'upload-1',
        alt: 'Image description',
        custom_data: { id: 'external-asset-1' },
      };
      const source = {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'block',
              item: {
                id: 'outer-block',
                type: 'item',
                relationships: itemType,
                attributes: {
                  image,
                  related_record: 'article-1',
                  nested: [
                    {
                      id: 'nested-block',
                      item_type: 'image-type',
                      image,
                    },
                  ],
                },
              },
            },
            {
              type: 'paragraph',
              children: [
                { type: 'span', value: 'Before ' },
                {
                  type: 'inlineBlock',
                  item: {
                    id: 'inline-block',
                    item_type: 'image-type',
                    image,
                  },
                },
                { type: 'inlineItem', item: 'article-1' },
                {
                  type: 'itemLink',
                  item: 'article-2',
                  children: [{ type: 'span', value: 'Read more' }],
                },
              ],
            },
          ],
        },
        links: [
          { id: 'article-1', item_type: 'article-type', title: 'Article' },
        ],
      };
      const original = structuredClone(source);
      const sanitized =
        localization === 'localized'
          ? sanitizeLocalizedFieldValuesForCreation({
              body: { 'fr-BE': source, en: null },
            }).body['fr-BE']
          : sanitizeFieldValuesForCreation({ body: source }).body;

      expect(sanitized).not.toHaveProperty('document.children.0.item.id');
      expect(sanitized).not.toHaveProperty(
        'document.children.0.item.attributes.nested.0.id',
      );
      expect(sanitized).not.toHaveProperty(
        'document.children.1.children.1.item.id',
      );
      expect(sanitized).toHaveProperty('document.children.0.item', {
        type: 'item',
        relationships: itemType,
        attributes: {
          image,
          related_record: 'article-1',
          nested: [
            { type: 'item', relationships: itemType, attributes: { image } },
          ],
        },
      });
      expect(sanitized).toHaveProperty('document.children.1.children', [
        { type: 'span', value: 'Before ' },
        {
          type: 'inlineBlock',
          item: {
            type: 'item',
            relationships: itemType,
            attributes: { image },
          },
        },
        { type: 'inlineItem', item: 'article-1' },
        {
          type: 'itemLink',
          item: 'article-2',
          children: [{ type: 'span', value: 'Read more' }],
        },
      ]);
      expect(sanitized).toHaveProperty('schema', 'dast');
      expect(sanitized).toHaveProperty('links', source.links);
      expect(source).toEqual(original);
    },
  );
});
