"""Check the cave's close mobile viewport through actual navigation and touches."""
import importlib.util
import math
from pathlib import Path
import sys
import unittest
sys.dont_write_bytecode=True
_spec=importlib.util.spec_from_file_location('cave_mobile_world',Path(__file__).with_name('fishing-world-browser.py'))
_fish=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_fish)

class CaveMobileTests(_fish._world.WorldBrowserCase):
    setUp=_fish.FishingWorldTests.setUp
    state=_fish.FishingWorldTests.state
    portal=_fish.FishingWorldTests.portal
    place=_fish.FishingWorldTests.place
    enter=_fish.FishingWorldTests.enter

    def point(self,x,y):
        box=self.page.locator('#fishingLakeCanvas').bounding_box();camera=self.state()['camera']
        return {'x':box['x']+(x-camera['x'])*camera['zoom']/1000*box['width'],
                'y':box['y']+(y-camera['y'])*camera['zoom']/620*box['height']}

    def walk(self,x,y):
        _fish.FishingWorldTests.walk_to(self,x,y)
        player=self.state()['player']
        self.assertLess(math.hypot(player['x']-x,player['y']-y),8,
                        'The avatar should reach the pier through the enlarged viewport')

    def assert_visible_actor(self,key):
        state=self.state();point=self.point(state[key]['x'],state[key]['y'])
        scene=self.page.locator('.fishing-cave-scene').bounding_box()
        self.assertGreaterEqual(point['x'],scene['x']+1);self.assertLessEqual(point['x'],scene['x']+scene['width']-1)
        self.assertGreaterEqual(point['y'],scene['y']+20);self.assertLessEqual(point['y'],scene['y']+scene['height']-1)
        self.assertTrue(self.page.evaluate('p=>document.elementFromPoint(p.x,p.y)?.id==="fishingLakeCanvas"',point),
            'The actor should stay visible without a control covering its feet')

    def test_mobile_view_is_close_full_height_and_keeps_actor_visible_after_rotation_phone(self):
        self.enter()
        for size in [{'width':390,'height':844},{'width':844,'height':390}]:
            self.page.set_viewport_size(size);self.page.clock.run_for(120)
            scene=self.page.locator('.fishing-cave-scene').bounding_box();canvas=self.page.locator('#fishingLakeCanvas').bounding_box()
            self.assertGreater(scene['height'],size['height']*.58)
            self.assertGreater(canvas['width']/1000*self.state()['camera']['zoom'],.7,
                'Mobile characters must be larger than a shrunken whole-room image')
            self.assertAlmostEqual(canvas['width']/canvas['height'],1000/620,delta=.002)
            self.assertLessEqual(self.page.locator('#rhythmFishing').evaluate('node=>node.scrollWidth'),size['width'])
            self.assertTrue(self.page.locator('#fishingMeter').is_visible())
            self.assert_visible_actor('player')
            self.page.screenshot(path='/tmp/coda-cave36-'+str(size['width'])+'.png')
        self.page.screenshot(path='/tmp/coda-cave36-mobile.png')

    def test_close_view_boat_steering_and_pinch_are_correct_and_editor_stays_independent_phone(self):
        self.enter();self.walk(218,380)
        self.page.locator('#fishingBoatBoard').click();self.page.clock.run_for(32)
        self.assertEqual(self.state()['phase'],'explore');self.assert_visible_actor('boat')
        before=self.state()['boat'];point={'id':1,**self.point(before['x']+28,before['y'])}
        client=self.context.new_cdp_session(self.page)
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});self.page.clock.run_for(180)
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});self.page.clock.run_for(32)
        self.assertGreater(self.state()['boat']['x'],before['x']+15)
        scene=self.page.locator('.fishing-cave-scene').bounding_box();x,y=scene['x'],scene['y'];w,h=scene['width'],scene['height']
        points=[{'id':1,'x':x+w*.45,'y':y+h*.4},{'id':2,'x':x+w*.55,'y':y+h*.4}]
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points})
        stopped=self.state()['boat']
        points=[{'id':1,'x':x+w*.25,'y':y+h*.4},{'id':2,'x':x+w*.75,'y':y+h*.4}]
        client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':points});self.page.clock.run_for(180)
        self.assertEqual(self.state()['camera']['zoom'],3);self.assertEqual(self.state()['boat'],stopped)
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});client.detach();self.page.clock.run_for(32)
        self.page.locator('#fishingLakeCanvas').focus();self.page.keyboard.press('F2');self.page.clock.run_for(32)
        canvas=self.page.locator('#fishingLakeCanvas').bounding_box();scene=self.page.locator('.fishing-cave-scene').bounding_box()
        self.assertAlmostEqual(canvas['width'],scene['width']-4,delta=2)
        self.assertEqual(self.state()['editor']['camera']['zoom'],1)
        self.page.keyboard.press('F2');self.page.clock.run_for(32);self.assertEqual(self.state()['camera']['zoom'],3)

    def test_desktop_retains_the_complete_uncropped_cave(self):
        self.enter();state=self.state();canvas=self.page.locator('#fishingLakeCanvas').bounding_box()
        self.assertEqual(state['camera']['zoom'],1)
        self.assertAlmostEqual(state['camera']['visibleWidth'],1000,delta=.1)
        self.assertAlmostEqual(canvas['width']/canvas['height'],1000/620,delta=.001)
        self.assertLess(canvas['height'],800)

if __name__=='__main__':unittest.main(verbosity=2)
