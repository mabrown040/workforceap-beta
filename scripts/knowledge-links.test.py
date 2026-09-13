#!/usr/bin/env python3
"""Dependency-free parser and local-navigation fixtures; no network or Git writes."""
import contextlib
import io
import runpy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


checker = runpy.run_path(str(Path(__file__).with_name('knowledge-links.py')))
destinations = checker['destinations']
headings = checker['headings']
validate = checker['validate']


class MarkdownParsingTests(unittest.TestCase):
    def values(self, text):
        return [destination for _, destination in destinations(text)]

    def test_balanced_encoded_escaped_and_angle_destinations(self):
        text = r'''[route](app/(group)/%5Bid%5D/page.tsx#L2)
[escaped](docs/a\(b\).md)
[space](<docs/a [b] (c).md>)'''
        self.assertEqual(self.values(text), [
            'app/(group)/%5Bid%5D/page.tsx#L2',
            'docs/a(b).md', 'docs/a [b] (c).md',
        ])

    def test_optional_titles(self):
        text = '''[a](a.md "A title") [b](b.md 'Another title')
[c](c.md (Parenthesized title)) [d](<d [x].md> "Title")'''
        self.assertEqual(self.values(text), ['a.md', 'b.md', 'c.md', 'd [x].md'])

    def test_escaped_titles_and_entities(self):
        self.assertEqual(self.values(r'[a](a.md "A \"quoted\" title")'), ['a.md'])
        self.assertEqual(self.values('[a](a.md?one=1&amp;two=2)'), ['a.md?one=1&two=2'])

    def test_malformed_links_need_balanced_outer_close(self):
        for text in ['[a](<a.md>', '[a](a.md', '[a](a(b.md)',
                     '[a](<a.md> "title"', '[a](a.md "title)', '[a](<a.md> junk)']:
            with self.subTest(text=text):
                self.assertEqual(self.values(text), [None])

    def test_fences_require_matching_character_and_minimum_length(self):
        text = '''````markdown
[ignored](missing.md)
```
[also ignored](missing2.md)
~~~~
[still ignored](missing3.md)
````
[visible](ok.md)
~~~text
[ignored again](missing4.md)
~~~
'''
        self.assertEqual(self.values(text), ['ok.md'])

    def test_inline_code_multiple_backticks_offsets_and_escaped_bracket(self):
        text = 'intro\n`[example](missing.md)` and ``literal ` [example](other.md)``\n'
        text += r'escaped\](not-a-link.md) [live](ok.md)'
        self.assertEqual(list(destinations(text)), [(text.index('](ok.md)'), 'ok.md')])
        self.assertEqual(text[:list(destinations(text))[0][0]].count('\n') + 1, 3)

    def test_unclosed_code_delimiter_does_not_hide_a_link(self):
        self.assertEqual(self.values('an unmatched ` then [a](a.md)'), ['a.md'])

    def test_heading_code_unicode_entities_and_collisions(self):
        source = '# API `status`\n# Résumé &amp; consent\n# Title\n# Title-1\n# Title\n'
        source += '````\n# Hidden\n```\n# Still hidden\n````\n'
        self.assertEqual(headings(source), {
            'api-status', 'résumé--consent', 'title', 'title-1', 'title-2',
        })


class NavigationFixtures(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='knowledge-links-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.kb = self.root / 'docs/knowledge-base'
        self.kb.mkdir(parents=True)
        self.page = self.kb / 'README.md'
        (self.kb / 'target [space] (group).md').write_text('# Hello `API`\n\ncontent\n')
        (self.root / 'source.ts').write_text('first\nsecond\nthird\n')

    def check(self, source):
        self.page.write_text(source)
        return validate(self.root, [self.page])

    def test_valid_targets_titles_encoded_characters_and_anchors(self):
        checked, failures = self.check('''[page](<target [space] (group).md#hello-api> "title")
[encoded](target%20%5Bspace%5D%20%28group%29.md#L3)
[range](../../source.ts#L1-L3)
[external](https://example.invalid/never-requested)
`[example](missing.md)`
''')
        self.assertEqual((checked, failures), (3, []))

    def test_missing_files_anchors_range_and_escape_fail(self):
        checked, failures = self.check('''[missing](absent.md)
[anchor](<target [space] (group).md#absent>)
[reverse](../../source.ts#L3-L1)
[out of range](../../source.ts#L4)
[outside](../../../outside.md)
''')
        self.assertEqual(checked, 5)
        self.assertEqual(len(failures), 5)
        self.assertTrue(all(f'docs/knowledge-base/README.md:{n}:' in failures[n - 1]
                            for n in range(1, 6)))
        self.assertEqual(sum('missing anchor' in failure for failure in failures), 3)

    def test_bad_url_is_reported_without_exception_or_network(self):
        checked, failures = self.check('[bad](http://[invalid)\n[bad](<source.ts>')
        self.assertEqual(checked, 0)
        self.assertEqual(len(failures), 2)
        self.assertIn('malformed destination', failures[0])
        self.assertIn('malformed or unclosed link', failures[1])

    def test_cli_nonzero_for_failure_zero_for_success(self):
        self.page.write_text('[missing](absent.md)')
        stdout = io.StringIO()
        with patch('subprocess.check_output', return_value=str(self.root)), contextlib.redirect_stdout(stdout):
            self.assertEqual(checker['main'](), 1)
        self.assertIn('1 failures.', stdout.getvalue())
        self.page.write_text('[valid](../../source.ts#L1)')
        with patch('subprocess.check_output', return_value=str(self.root)), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(checker['main'](), 0)


if __name__ == '__main__':
    unittest.main()
