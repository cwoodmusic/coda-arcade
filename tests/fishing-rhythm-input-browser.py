"""Real touch input stays precise when the fishing RAF is deliberately late."""
import importlib.util
import math
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode=True
_spec=importlib.util.spec_from_file_location('rhythm_input_world',Path(__file__).with_name('fishing-upgrade-browser.py'))
_upgrade=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_upgrade)


class FishingRhythmInputTests(_upgrade._fish._world.WorldBrowserCase):
    state=_upgrade.FishingUpgradeTests.state
    portal=_upgrade.FishingUpgradeTests.portal
    place=_upgrade.FishingUpgradeTests.place
    enter=_upgrade.FishingUpgradeTests.enter
    walk_to=_upgrade.FishingUpgradeTests.walk_to
    board=_upgrade.FishingUpgradeTests.board
    start_exploring=_upgrade.FishingUpgradeTests.start_exploring
    place_single_fish=_upgrade.FishingUpgradeTests.place_single_fish

    def setUp(self):
        _upgrade._fish.FishingWorldTests.setUp(self)
        self.page.clock.pause_at(self.page.evaluate('Date.now()/1000')+5)
        self.client=self.context.new_cdp_session(self.page)
        self.points={}
        self.page.wait_for_function("!!(window.CodaFishingRhythmInput&&typeof CodaRhythmFishing.createSession==='function')")

    def tearDown(self):
        self.client.detach()
        super().tearDown()

    def begin(self,fish='starlight-sturgeon',meter='6/8'):
        self.start_exploring(meter);self.place_single_fish(fish)
        self.page.locator('#fishingCast').click(force=True);self.page.clock.run_for(1400)
        self.assertEqual(self.state()['phase'],'rhythm')
        self.page.locator('#fishingTap').scroll_into_view_if_needed()
        self.page.evaluate('''()=>{
          const real=requestAnimationFrame;window.deferFishingFrames=false;window.deferredFishingFrame=null;
          window.requestAnimationFrame=function(callback){
            if(deferFishingFrames&&callback.name==='tick'){deferredFishingFrame=callback;return 2147483000;}
            return real.call(window,callback);
          };
          window.resumeFishingFrame=()=>{deferFishingFrames=false;const callback=deferredFishingFrame;
            deferredFishingFrame=null;if(callback)real.call(window,callback);};
          window.deferFishingFrames=true;
        }''')
        self.page.clock.run_for(32)
        # An innocuous actual touch during count-in also establishes the exact
        # source-clock offset, without directly advancing the game session.
        self.down(11);self.up(11)
        self.assertEqual(self.state()['challenge']['hits'],0)
        self.offset=self.page.evaluate('performance.now()/1000')-self.state()['clock']

    def source_to(self,game_time):
        current=self.page.evaluate('performance.now()/1000')-self.offset
        self.page.clock.run_for(max(0,round((game_time+.002-current)*1000)))

    def target_point(self,target='pad',fraction=.5):
        node=self.page.locator('#fishingTap' if target=='pad' else '#fishingRhythmCanvas')
        box=node.bounding_box()
        return {'x':box['x']+box['width']*fraction,'y':box['y']+box['height']*.65}

    def down(self,identifier,target='pad',fraction=.5):
        self.points[identifier]={'id':identifier,**self.target_point(target,fraction)}
        self.client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':list(self.points.values())})

    def up(self,identifier):
        ended=self.points.pop(identifier,None)
        # CDP's targeted TouchEnd describes the contact being lifted, rather
        # than the contacts that stay down. An empty list ends the final one.
        self.client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[ended] if self.points else []})

    def test_three_fast_alternating_touches_hit_presto_notes_with_delayed_frames_phone(self):
        self.begin()
        initial=self.state();notes=[note for note in initial['challenge']['notes'] if not note['rest']][:3]
        self.assertTrue(all(note['duration']<1 for note in notes))
        self.assertLess(notes[1]['time']-notes[0]['time'],.09)
        self.assertLess(notes[2]['time']-notes[1]['time'],.09)
        self.assertEqual(self.page.locator('#fishingTap').evaluate('e=>getComputedStyle(e).touchAction'),'none')
        scale=self.page.evaluate('visualViewport.scale');scroll=self.page.locator('#rhythmFishing').evaluate('e=>e.scrollTop')
        self.source_to(notes[0]['time']);self.down(1,fraction=.35)
        self.assertEqual(self.state()['challenge']['hits'],1)
        self.source_to(notes[1]['time']);self.down(2,fraction=.65)
        self.assertEqual(self.state()['challenge']['hits'],2)
        self.up(1)
        self.source_to(notes[2]['time']);self.down(3,fraction=.35)
        after=self.state();self.assertEqual(after['challenge']['hits'],3)
        self.assertEqual(after['challenge']['extras'],0);self.assertEqual(after['challenge']['misses'],0)
        self.assertGreater(after['clock'],initial['clock']+.5,'Scoring must advance even though the render frame is still deferred')
        self.assertLess(abs(after['clock']-notes[2]['time']),notes[2]['window'])
        self.up(2);self.up(3)
        self.assertEqual(self.state()['challenge']['pressedSources'],[])
        self.assertEqual(self.page.evaluate('visualViewport.scale'),scale)
        self.assertEqual(self.page.locator('#rhythmFishing').evaluate('e=>e.scrollTop'),scroll)
        # Compatibility clicks and pointer releases must not generate extra hits.
        self.page.locator('#fishingTap').dispatch_event('click',{'detail':1})
        self.assertEqual(self.state()['challenge']['hits'],3);self.assertEqual(self.state()['challenge']['extras'],0)
        before=self.state()['clock'];self.page.evaluate('resumeFishingFrame()');self.page.clock.run_for(16)
        self.assertLess(self.state()['clock']-before,.025,'The resumed frame must not count the tap elapsed time twice')

    def test_fast_staff_taps_do_not_turn_late_presses_or_mashing_into_hits_phone(self):
        self.begin();notes=[note for note in self.state()['challenge']['notes'] if not note['rest']]
        for index,note in enumerate(notes[:3]):
            self.source_to(note['time']);self.down(index+1,'staff',.6);self.up(index+1)
        self.assertEqual(self.state()['challenge']['hits'],3)
        for identifier in [10,20]:self.down(identifier,'staff');self.up(identifier)
        state=self.state()['challenge'];self.assertEqual(state['hits'],3);self.assertEqual(state['extras'],2)
        late=notes[3];self.source_to(late['time']+late['window']+.015)
        self.down(21,'staff');self.up(21)
        after=self.state()['challenge'];self.assertEqual(after['hits'],3)
        self.assertGreater(after['misses'],state['misses']);self.assertGreater(after['extras'],state['extras'])
        self.assertLess(after['progress'],state['progress']);self.assertEqual(self.state()['collection']['total'],0)

    def test_long_touch_holds_award_at_the_tail_and_early_lift_misses_once_phone(self):
        self.begin('silver-minnow','4/4');note=self.state()['challenge']['notes'][0]
        self.assertTrue(note['requiresHold'])
        self.source_to(note['time']);self.down(1)
        head=self.state()['challenge'];self.assertEqual(head['hits'],0);self.assertEqual(head['progress'],45)
        self.assertEqual(len(head['activeHolds']),1)
        self.source_to(note['holdEndTime']);self.up(1)
        held=self.state()['challenge'];self.assertEqual(held['hits'],1);self.assertEqual(held['misses'],0)
        second=next(n for n in held['notes'] if n['judgement']=='pending')
        self.source_to(second['time']);self.down(2)
        self.source_to(second['time']+second['durationSeconds']*.25);self.up(2)
        early=self.state()['challenge'];self.assertEqual(early['hits'],1);self.assertEqual(early['misses'],1)
        self.page.locator('#fishingTap').dispatch_event('pointerup',{'pointerId':999,'button':0})
        self.assertEqual(self.state()['challenge']['misses'],1);self.assertEqual(self.state()['challenge']['pressedSources'],[])

    def test_hold_pause_and_touch_cancel_release_sources_without_sticking_phone(self):
        self.begin('silver-minnow','4/4');note=self.state()['challenge']['notes'][0]
        self.source_to(note['time']);self.down(1)
        self.page.locator('#fishingPause').click(force=True)
        paused=self.state();self.assertTrue(paused['paused']);self.assertEqual(paused['challenge']['pressedSources'],[])
        self.page.clock.run_for(3000);self.assertEqual(self.state()['clock'],paused['clock'])
        self.up(1)
        self.page.locator('#fishingPause').click(force=True)
        self.page.evaluate('resumeFishingFrame()');self.page.clock.run_for(math.ceil(note['durationSeconds']*1000)+20)
        after=self.state()['challenge'];self.assertEqual(after['hits'],1);self.assertEqual(after['misses'],0)
        second=next(n for n in after['notes'] if n['judgement']=='pending')
        self.page.locator('#fishingRhythmCanvas').focus();self.page.keyboard.down('Space')
        self.page.keyboard.down('Space')
        self.assertEqual(self.state()['challenge']['extras'],0,'Keyboard auto-repeat must not mash a held head')
        self.page.clock.run_for(120)
        self.page.keyboard.up('Space')
        self.assertEqual(self.state()['challenge']['misses'],1)
        self.assertEqual(self.state()['challenge']['pressedSources'],[])
        third=next(n for n in self.state()['challenge']['notes'] if n['judgement']=='pending')
        for _ in range(100):
            if self.state()['clock']>=third['time']:break
            self.page.clock.run_for(5)
        self.down(2)
        self.page.clock.run_for(100)
        self.points.clear();self.client.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
        self.assertEqual(self.state()['challenge']['misses'],2)
        self.assertEqual(self.state()['challenge']['pressedSources'],[])


if __name__=='__main__':unittest.main(verbosity=2)
