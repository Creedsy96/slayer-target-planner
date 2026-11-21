import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from guide_wikitext import fields, monster_forms, monster_locations, number, representative_form
from build_creature_guide import build


class GuideParserTests(unittest.TestCase):
    def test_numbered_stats_and_quest_forms_do_not_hide_the_repeatable_spawn(self):
        source = '{{Infobox Monster|version1=Quest|combat1=50|hitpoints1=60|version2=Regular|combat2=54|hitpoints2=85|slaylvl=63}}\n{{LocLine|location=[[Town]]|levels=54}}'
        form = representative_form(monster_forms(source), monster_locations(source))
        self.assertEqual((form['hitpoints'], form['combat'], form['slaylvl']), (85, 54, 63))
        self.assertIsNone(representative_form([], []))

    def test_every_cached_master_alternative_with_active_stats_is_retained(self):
        data = json.loads((ROOT / 'data/catalogue.json').read_text(encoding='utf-8'))
        variants = {v['source']['title'].casefold(): v for v in data['variants']}
        pages = {p['title'].casefold(): p for path in (ROOT / 'data/sources').glob('*.json')
                 if (p := json.loads(path.read_text(encoding='utf-8-sig'))).get('revisions')}
        checked = set()
        for master in data['masters']:
            for row in master['tasks']:
                for title in row.get('alternativeTitles', []):
                    page = pages.get(title.casefold())
                    if not page:
                        continue
                    text = page['revisions'][0]['slots']['main']['content']
                    if representative_form(monster_forms(text), monster_locations(text)) is None:
                        continue
                    if re.search(r'\|\s*superior\s*=\s*(?:yes|true)', text, re.I):
                        continue
                    variant = variants[page['title'].casefold()]
                    self.assertIn(row['id'], variant['assignmentIds'], title)
                    self.assertIn(variant['id'], next(a for a in data['assignments'] if a['id'] == row['id'])['variantIds'])
                    checked.add(variant['id'])
        self.assertGreater(len(checked), 100)

    def test_nested_templates_and_links_do_not_split_infobox_fields(self):
        result = fields('|attack style=[[Melee|Slash]]|max hit=20 {{efn|text=a|b}}|dstab=-15|dmagic=0')
        self.assertEqual(result['attack style'], '[[Melee|Slash]]')
        self.assertEqual(number(result['dstab']), -15)
        self.assertEqual(number(result['dmagic']), 0)
        self.assertIsNone(number('20 (melee), 50 (fire)'))

    def test_versioned_stats_keep_the_active_spawn_and_shared_zero(self):
        source = '{{Infobox Monster|version1=Whirlpool|version2=Active|combat1=N/A|combat2=291|hitpoints=255|dmagic=0|attack style=[[Magic]]}}'
        forms = monster_forms(source)
        self.assertEqual(len(forms), 1)
        self.assertEqual(forms[0]['id'], 'form-2')
        self.assertEqual(forms[0]['combat'], 291)
        self.assertEqual(forms[0]['dmagic'], 0)

    def test_summoned_creature_can_have_unknown_combat_level(self):
        result = monster_forms('{{Infobox Monster|name=Reanimated aviansie|combat=N/A|hitpoints=35}}')
        self.assertEqual(len(result), 1)
        self.assertIsNone(result[0]['combat'])
        self.assertEqual(result[0]['hitpoints'], 35)

    def test_location_keeps_room_caveats_and_wilderness_region(self):
        source = '{{LocLine|name=Example|location=[[Cave]] (task only)<ref>Requires [[A Quest]].</ref>|levels=20|leagueRegion=Wilderness}}'
        loc = monster_locations(source)[0]
        self.assertTrue(loc['taskOnly'])
        self.assertEqual(loc['region'], 'Wilderness')
        self.assertEqual(loc['caveat'], 'Requires A Quest.')

    def test_cached_guide_is_reproducible_without_network_requests(self):
        expected = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
        self.assertEqual((ROOT / 'data/creature-guide.json').read_text(encoding='utf-8'), expected)

    def test_capture_rejects_a_request_interval_below_the_guard(self):
        result = subprocess.run([sys.executable, str(ROOT / 'tools/capture_guide_sources.py'), '--fetch', '--interval', '1'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('at least five seconds', result.stderr)
        for tool in ['capture_variant_sources.py', 'build_creature_art.py']:
            result = subprocess.run([sys.executable, str(ROOT / 'tools' / tool), '--interval', '1'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn('at least five seconds', result.stderr)


if __name__ == '__main__':
    unittest.main()
