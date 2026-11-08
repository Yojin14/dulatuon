<?php

namespace App\Support;

use DOMComment;
use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Cleans rich text from the flipbook editor down to an allow-list: basic formatting, lists,
 * links, headings, pictures from our own flipbook uploads, and a few text styles (colour,
 * highlight, font, weight). Everything else (scripts, event handlers, other styles) is removed.
 */
class RichTextSanitizer
{
    private const TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'h3', 'h4', 'blockquote', 'span', 'img'];

    /** Elements dropped together with everything inside them. */
    private const DROP = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta'];

    public const IMAGE_PREFIX = '/storage/course-content/flipbook/';

    /** Fonts the editor offers (the default font needs no style). */
    private const FONTS = ['bricolage grotesque', 'arial', 'georgia', 'times new roman', 'courier new'];

    private const ALIGNS = ['left', 'center', 'right'];

    private const SIZES = ['small', 'medium', 'large', 'full'];

    /** Text sizes the editor offers (FLIPBOOK_SIZES in flipbook-extensions.ts). */
    private const FONT_SIZES = ['0.875rem', '1.25rem', '1.6rem'];

    private const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'];

    public static function flipbook(string $html): string
    {
        if (trim($html) === '') {
            return '';
        }

        $doc = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"><div>'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $doc->getElementsByTagName('div')->item(0);
        if ($root === null) {
            return '';
        }
        self::clean($root);

        $out = '';
        foreach (iterator_to_array($root->childNodes) as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    /**
     * Every picture URL used in a piece of cleaned rich text.
     *
     * @return list<string>
     */
    public static function imageUrls(string $html): array
    {
        preg_match_all('/<img[^>]+src="([^"]+)"/i', $html, $matches);

        return array_values(array_unique($matches[1] ?? []));
    }

    private static function clean(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMComment) {
                $node->removeChild($child);

                continue;
            }
            if (! $child instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($child->tagName);
            if (in_array($tag, self::DROP, true)) {
                $node->removeChild($child);

                continue;
            }

            self::clean($child);

            if (! in_array($tag, self::TAGS, true)) {
                // Unknown wrapper (div, font, …): keep its cleaned contents, drop the tag.
                while ($child->firstChild) {
                    $node->insertBefore($child->firstChild, $child);
                }
                $node->removeChild($child);

                continue;
            }

            self::cleanAttributes($child, $tag);

            if ($tag === 'img' && ! $child->hasAttribute('src')) {
                $node->removeChild($child);
            }
        }
    }

    private static function cleanAttributes(DOMElement $element, string $tag): void
    {
        $keep = [];

        if ($tag === 'a') {
            $href = trim($element->getAttribute('href'));
            $keep['href'] = preg_match('/^(https?:|mailto:)/i', $href) ? $href : '#';
        }

        if ($tag === 'img') {
            $src = trim($element->getAttribute('src'));
            if (str_starts_with($src, self::IMAGE_PREFIX) && ! str_contains($src, '..') && preg_match('#^[\w/.\-]+$#', $src)) {
                $keep['src'] = $src;
            }
            $alt = trim($element->getAttribute('alt'));
            if ($alt !== '') {
                $keep['alt'] = mb_substr($alt, 0, 255);
            }
            $align = $element->getAttribute('data-align');
            $keep['data-align'] = in_array($align, self::ALIGNS, true) ? $align : 'center';
            $size = $element->getAttribute('data-size');
            $keep['data-size'] = in_array($size, self::SIZES, true) ? $size : 'medium';
        }

        if (in_array($tag, ['p', 'h3', 'h4'], true)) {
            $style = self::cleanAlignment($element->getAttribute('style'));
            if ($style !== '') {
                $keep['style'] = $style;
            }
        }

        if ($tag === 'span') {
            $style = self::cleanStyle($element->getAttribute('style'));
            if ($style !== '') {
                $keep['style'] = $style;
            }
        }

        foreach (iterator_to_array($element->attributes) as $attribute) {
            $element->removeAttribute($attribute->nodeName);
        }
        foreach ($keep as $name => $value) {
            $element->setAttribute($name, $value);
        }
    }

    private static function cleanStyle(string $style): string
    {
        $declarations = [];
        foreach (explode(';', $style) as $declaration) {
            if (! str_contains($declaration, ':')) {
                continue;
            }
            [$property, $value] = array_map('trim', explode(':', $declaration, 2));
            $property = strtolower($property);

            $clean = match ($property) {
                'color', 'background-color' => self::cleanColor($value),
                'font-family' => self::cleanFont($value),
                'font-weight' => preg_match('/^(normal|bold|[1-9]00)$/i', $value) ? strtolower($value) : null,
                'font-size' => in_array(strtolower($value), self::FONT_SIZES, true) ? strtolower($value) : null,
                default => null,
            };
            if ($clean !== null) {
                $declarations[$property] = "{$property}: {$clean}";
            }
        }

        return implode('; ', $declarations);
    }

    /**
     * Paragraphs and headings may only carry a text alignment.
     */
    private static function cleanAlignment(string $style): string
    {
        if (preg_match('/(?:^|;)\s*text-align\s*:\s*([a-z]+)/i', $style, $match)
            && in_array(strtolower($match[1]), self::TEXT_ALIGNS, true)) {
            return 'text-align: '.strtolower($match[1]);
        }

        return '';
    }

    private static function cleanColor(string $value): ?string
    {
        if (preg_match('/^#[0-9a-f]{3,8}$/i', $value)) {
            return strtolower($value);
        }
        if (preg_match('/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i', $value)) {
            return strtolower(preg_replace('/\s+/', '', $value) ?? '');
        }

        return null;
    }

    private static function cleanFont(string $value): ?string
    {
        $first = strtolower(trim(explode(',', $value)[0], " \t\"'"));

        foreach (self::FONTS as $font) {
            if ($first === $font) {
                return ucwords($font);
            }
        }

        return null;
    }
}
