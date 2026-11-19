import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from guide_wikitext import fields, monster_forms, monster_locations, number
from build_creature_guide import build


class GuideParserTests(unittest.TestCase):
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


if __name__ == '__main__':
    unittest.main()
