<?php

namespace Tests\Unit;

use App\Support\RichTextSanitizer;
use PHPUnit\Framework\TestCase;

class RichTextSanitizerTest extends TestCase
{
    public function test_it_keeps_formatting_pictures_and_text_styles(): void
    {
        $html = '<h3>Faults</h3>'
            .'<img src="/storage/course-content/flipbook/a1.webp" data-align="right" data-size="small" alt="Fault">'
            .'<p>Rocks <strong>slip</strong> along a <span style="color: #dc2626; background-color: rgb(254, 240, 138); font-family: Georgia; font-weight: 800">fault</span>.</p>'
            .'<ul><li>Drop</li></ul><p><a href="https://phivolcs.dost.gov.ph">PHIVOLCS</a></p>';

        $clean = RichTextSanitizer::flipbook($html);

        $this->assertStringContainsString('<h3>Faults</h3>', $clean);
        $this->assertStringContainsString('<img src="/storage/course-content/flipbook/a1.webp" alt="Fault" data-align="right" data-size="small">', $clean);
        $this->assertStringContainsString('style="color: #dc2626; background-color: rgb(254,240,138); font-family: Georgia; font-weight: 800"', $clean);
        $this->assertStringContainsString('<strong>slip</strong>', $clean);
        $this->assertStringContainsString('<a href="https://phivolcs.dost.gov.ph">PHIVOLCS</a>', $clean);
    }

    public function test_it_removes_dangerous_markup(): void
    {
        $html = '<p onclick="steal()">Hi<script>alert(1)</script></p>'
            .'<a href="javascript:alert(1)">x</a>'
            .'<img src="https://evil.test/x.png" onerror="alert(1)">'
            .'<img src="/storage/course-content/flipbook/../../.env">'
            .'<iframe src="https://evil.test"></iframe>'
            .'<span style="position: fixed; color: red; background-image: url(https://evil.test); font-family: Comic Sans MS">styled</span>';

        $clean = RichTextSanitizer::flipbook($html);

        foreach (['onclick', 'script', 'alert(1)', 'javascript:', 'evil.test', 'onerror', '.env', 'iframe', 'position', 'background-image', 'Comic Sans'] as $bad) {
            $this->assertStringNotContainsString($bad, $clean, $bad);
        }
        $this->assertStringContainsString('<p>Hi</p>', $clean);
        $this->assertStringContainsString('<span>styled</span>', $clean);
        $this->assertStringContainsString('<a href="#">x</a>', $clean);
    }

    public function test_unknown_wrappers_are_unwrapped_and_bad_picture_options_reset(): void
    {
        $clean = RichTextSanitizer::flipbook('<div><font color="red">Keep me</font></div><img src="/storage/course-content/flipbook/b.png" data-align="sideways" data-size="huge">');

        $this->assertStringContainsString('Keep me', $clean);
        $this->assertStringNotContainsString('<font', $clean);
        $this->assertStringNotContainsString('<div', $clean);
        $this->assertStringContainsString('data-align="center" data-size="medium"', $clean);
    }

    public function test_it_keeps_alignment_and_allowed_text_sizes_only(): void
    {
        $clean = RichTextSanitizer::flipbook(
            '<h3 style="text-align: center; color: red">Title</h3>'
            .'<p style="text-align: justify">Body</p>'
            .'<p style="text-align: sideways; position: absolute">Odd</p>'
            .'<p><span style="font-size: 1.6rem">Big</span> <span style="font-size: 90px">Huge</span></p>'
        );

        $this->assertStringContainsString('<h3 style="text-align: center">Title</h3>', $clean);
        $this->assertStringContainsString('<p style="text-align: justify">Body</p>', $clean);
        $this->assertStringContainsString('<p>Odd</p>', $clean);
        $this->assertStringContainsString('<span style="font-size: 1.6rem">Big</span>', $clean);
        $this->assertStringContainsString('<span>Huge</span>', $clean);
        $this->assertStringNotContainsString('position', $clean);
        $this->assertStringNotContainsString('90px', $clean);
    }

    public function test_it_lists_picture_urls(): void
    {
        $html = RichTextSanitizer::flipbook('<img src="/storage/course-content/flipbook/a.png"><p>x</p><img src="/storage/course-content/flipbook/b.png">');

        $this->assertSame(['/storage/course-content/flipbook/a.png', '/storage/course-content/flipbook/b.png'], RichTextSanitizer::imageUrls($html));
        $this->assertSame('', RichTextSanitizer::flipbook('   '));
    }
}
