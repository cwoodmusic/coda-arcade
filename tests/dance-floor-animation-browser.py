"""Real canvas color cycling, grounded contact brightness and motion preferences."""
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('dance_animation_world', Path(__file__).with_name('learning-world-browser.py'))
world = importlib.util.module_from_spec(spec)
spec.loader.exec_module(world)


class DanceFloorAnimationTests(world.WorldBrowserCase):
    def setUp(self):
        super().setUp()
        self.context.add_init_script("localStorage.setItem('codaArcadeFXV1','full')")
        self.load()

    def floor(self):
        return self.page.evaluate('CodaArcadeQA.danceFloor()')

    def test_idle_panels_change_color_and_keep_the_original_grout(self):
        before = self.floor()
        self.assertTrue(before['animated'])
        self.assertEqual(before['active'], [])
        self.page.wait_for_timeout(3100)
        after = self.floor()
        self.assertTrue(all(a['color'] != b['color'] for a, b in zip(before['tiles'], after['tiles'])))
        self.assertEqual([tile['polygon'] for tile in before['tiles']], [tile['polygon'] for tile in after['tiles']])
        # Render the real component on a neutral backing to make color and
        # brightness witnesses independent of roaming NPCs and moving beams.
        pixels = self.page.evaluate('''()=>{
          const canvas=document.createElement('canvas');canvas.width=1672;canvas.height=941;
          const g=canvas.getContext('2d'),tile=CodaArcadeQA.danceFloor().tiles[20];
          let time=0,player={x:0,y:0,jumpHeight:0};
          const floor=createCodaDanceFloor({getTime:()=>time,getPlayer:()=>player});
          const draw=()=>{g.fillStyle='#28303d';g.fillRect(0,0,1672,941);floor.draw(g);
            return [...g.getImageData(Math.floor(tile.center[0])+7,Math.floor(tile.center[1])+5,1,1).data];};
          const first=draw();time=2.8;const next=draw();
          player={x:tile.center[0],y:tile.center[1],jumpHeight:0};const stepped=draw();
          player.jumpHeight=12;time=4;const airborne=draw();
          return {first,next,stepped,airborne,edge:[...g.getImageData(110,670,1,1).data]};
        }''')
        self.assertNotEqual(pixels['first'], pixels['next'])
        self.assertGreater(sum(pixels['stepped'][:3]), sum(pixels['next'][:3]) + 80)
        self.assertEqual(pixels['edge'], [40, 48, 61, 255], 'Color passes stay inside measured tile borders')

    def test_motion_off_and_reduced_motion_stop_color_changes_but_keep_steps(self):
        self.page.evaluate("localStorage.setItem('arcadeAnimations','off')")
        first = self.floor()
        self.assertFalse(first['animated'])
        self.page.wait_for_timeout(300)
        self.assertEqual([tile['color'] for tile in self.floor()['tiles']], [tile['color'] for tile in first['tiles']])
        tile = next(tile for tile in first['tiles'][20:] if self.page.evaluate('p=>CodaArcadeQA.walkable(...p)', tile['center']))
        self.place(*tile['center'])
        stepped = self.floor()
        self.assertEqual(stepped['current'], tile['id'])
        self.assertEqual(next(light for light in stepped['active'] if light['id'] == tile['id'])['intensity'], 1)
        self.page.keyboard.press('Space')
        self.page.wait_for_function('CodaArcadeQA.characters().player.jumpHeight>3')
        self.assertIsNone(self.floor()['current'])
        self.page.evaluate("localStorage.setItem('arcadeAnimations','on')")
        self.assertTrue(self.floor()['animated'])
        self.page.emulate_media(reduced_motion='reduce')
        reduced = self.floor()
        self.assertFalse(reduced['animated'])
        self.page.wait_for_timeout(300)
        self.assertEqual([tile['color'] for tile in self.floor()['tiles']], [tile['color'] for tile in reduced['tiles']])


if __name__ == '__main__':
    unittest.main(verbosity=2)
