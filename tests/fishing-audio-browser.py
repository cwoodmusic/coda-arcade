"""Exercise independent fishing music, metronome and guide controls in Chromium.

Audio is inspected at actual Web Audio scheduling calls. All test profiles are
local and disposable; the real fishing room and input handlers remain in use.
"""
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location('fishing_audio_upgrade', Path(__file__).with_name('fishing-upgrade-browser.py'))
_upgrade = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_upgrade)


class FishingAudioTests(_upgrade._fish._world.WorldBrowserCase):
    state = _upgrade.FishingUpgradeTests.state
    portal = _upgrade.FishingUpgradeTests.portal
    place = _upgrade.FishingUpgradeTests.place
    enter = _upgrade.FishingUpgradeTests.enter
    walk_to = _upgrade.FishingUpgradeTests.walk_to
    board = _upgrade.FishingUpgradeTests.board
    start_exploring = _upgrade.FishingUpgradeTests.start_exploring
    place_single_fish = _upgrade.FishingUpgradeTests.place_single_fish
    advance_to = _upgrade.FishingUpgradeTests.advance_to
    tap_note = _upgrade.FishingUpgradeTests.tap_note

    def setUp(self):
        _upgrade.FishingUpgradeTests.setUp(self)
        self.page.wait_for_function('window.CodaFishingMusic && document.querySelector("#fishingAudioPanel")')
        self.page.evaluate('''()=>{
          window.fishingAudioSounds=[];
          const Audio=window.AudioContext||window.webkitAudioContext;
          if(!Audio)throw Error('Chromium must supply Web Audio for this check');
          const original=Audio.prototype.createOscillator;
          Audio.prototype.createOscillator=function(...args){
            const oscillator=original.apply(this,args),ctx=this;
            const start=oscillator.start,stop=oscillator.stop,set=oscillator.frequency.setValueAtTime;
            let frequency=oscillator.frequency.value,entry=null;
            oscillator.frequency.setValueAtTime=function(value,...times){frequency=value;return set.call(this,value,...times);};
            oscillator.start=function(when,...rest){
              const state=CodaArcadeQA.fishing();
              entry={frequency,when:when??ctx.currentTime,audioNow:ctx.currentTime,
                gameTime:state.clock+Math.max(0,(when??ctx.currentTime)-ctx.currentTime),
                phase:state.phase,canceled:false};
              fishingAudioSounds.push(entry);return start.call(this,when,...rest);
            };
            oscillator.stop=function(when,...rest){
              if(entry&&when===undefined&&entry.gameTime>CodaArcadeQA.fishing().clock+1e-7)entry.canceled=true;
              return stop.call(this,when,...rest);
            };
            return oscillator;
          };
        }''')

    def open_audio(self):
        room=self.state()
        self.page.locator('#fishingAudio' if room['phase'] in ['bite','rhythm'] else '#fishingLakeAudio').click(force=True)
        self.assertTrue(self.page.locator('#fishingAudioPanel').is_visible())

    def close_audio(self):
        self.page.locator('#fishingAudioClose').click(force=True)
        self.assertFalse(self.page.locator('#fishingAudioPanel').is_visible())

    def option(self,name,value):
        self.page.locator('#'+name).set_checked(value,force=True)

    def settings(self,**changes):
        self.open_audio()
        ids={'music':'fishingMusic','metronome':'fishingMetronome','guide':'fishingGuide','sound':'fishingMasterSound'}
        for name,value in changes.items():self.option(ids[name],value)
        self.close_audio()

    def sounds(self):
        return self.page.evaluate('fishingAudioSounds.filter(s=>!s.canceled)')

    def clear_sounds(self):
        self.page.evaluate('fishingAudioSounds=[]')

    def battle(self,meter='4/4'):
        if not self.state()['open']:self.start_exploring(meter)
        else:self.page.locator('#fishingMeter').select_option(meter)
        self.place_single_fish('silver-minnow')
        self.page.locator('#fishingCast').click(force=True);self.page.clock.run_for(1400)
        self.assertEqual(self.state()['phase'],'rhythm')
        return self.state()

    def reach_music(self,notes=2):
        for _ in range(notes):self.tap_note()
        return self.state()

    def test_music_metronome_and_guide_settings_save_independently(self):
        self.enter();self.open_audio()
        for selector in ['fishingMusic','fishingMetronome','fishingGuide','fishingMasterSound']:
            self.assertTrue(self.page.locator('#'+selector).is_checked(),selector)
        self.option('fishingMetronome',False);self.option('fishingGuide',False)
        self.close_audio();self.clear_sounds();self.page.clock.run_for(2400)
        sound=self.sounds()
        self.assertGreater(len(sound),0,'The cave needs actual background music, rather than just a click track')
        frequencies={round(s['frequency'],2) for s in sound}
        self.assertGreaterEqual(len(frequencies),3,'The accompaniment should contain bass and harmony')
        self.assertTrue(all(f<400 for f in frequencies),frequencies)
        stored=self.page.evaluate("JSON.parse(localStorage.getItem('codaFishingAudioV1'))")
        self.assertEqual({key:stored[key] for key in ['music','metronome','guide','sound']},
            {'music':True,'metronome':False,'guide':False,'sound':True})
        self.page.locator('#fishingClose').click(force=True);self.load()
        self.page.clock.run_for(32);self.page.locator('#fishingBtn').click(force=True);self.page.clock.run_for(32)
        self.open_audio()
        self.assertTrue(self.page.locator('#fishingMusic').is_checked())
        self.assertFalse(self.page.locator('#fishingMetronome').is_checked())
        self.assertFalse(self.page.locator('#fishingGuide').is_checked())
        self.assertTrue(self.page.locator('#fishingMasterSound').is_checked())

    def test_music_and_metronome_can_each_play_without_the_other(self):
        self.start_exploring();self.settings(music=True,metronome=False,guide=False)
        self.clear_sounds();self.battle();initial=self.state()['challenge']
        self.reach_music(2)
        sounds=self.sounds()
        self.assertEqual(self.state()['audioState'],'running','A real user gesture must unlock Web Audio')
        self.assertTrue(any(s['frequency']<400 for s in sounds))
        self.assertFalse(any(s['frequency'] in [480,680] for s in sounds),'Metronome Off must silence its clicks')
        self.assertFalse(any(abs(s['frequency']-523.25)<1 for s in sounds),'Guide Off must silence target tones')
        self.assertTrue(all(s['gameTime']>=initial['musicStart']-.001
            for s in sounds if s['phase']=='rhythm'),
            'Background music must leave the introductory count-in clear')
        self.settings(music=False,metronome=True,guide=False)
        self.clear_sounds();self.reach_music(2)
        sounds=self.sounds()
        self.assertTrue(any(s['frequency'] in [480,680] for s in sounds))
        self.assertFalse(any(s['frequency']<400 for s in sounds),'Music Off must stop the accompaniment')
        self.assertFalse(any(abs(s['frequency']-523.25)<1 for s in sounds))
        self.settings(music=False,metronome=False,guide=True)
        self.clear_sounds();self.reach_music(2)
        sounds=self.sounds()
        self.assertTrue(any(abs(s['frequency']-523.25)<1 for s in sounds),'The guide must work without music or clicks')
        self.assertTrue(all(abs(s['frequency']-523.25)<1 for s in sounds),sounds)

    def test_audio_settings_pause_the_battle_and_respect_a_manual_pause(self):
        self.battle();self.open_audio();frozen=self.state()
        self.assertTrue(frozen['paused']);self.assertEqual(frozen['voiceCount'],0)
        self.page.clock.run_for(6000)
        self.assertEqual(self.state()['clock'],frozen['clock'])
        self.assertEqual(self.state()['challenge']['progress'],frozen['challenge']['progress'])
        self.close_audio();self.assertFalse(self.state()['paused'])
        self.page.clock.run_for(32)
        self.assertGreater(self.state()['clock'],frozen['clock'])
        self.page.locator('#fishingPause').click(force=True)
        self.assertTrue(self.state()['paused']);self.open_audio();self.close_audio()
        self.assertTrue(self.state()['paused'],'Closing audio controls must not undo an intentional pause')
        self.open_audio();self.page.keyboard.press('Escape')
        self.assertFalse(self.page.locator('#fishingAudioPanel').is_visible())
        self.assertTrue(self.state()['open'],'Escape closes the audio panel before leaving the cave')

    def test_master_sound_and_hidden_page_stop_all_channels(self):
        self.battle();self.reach_music(1)
        self.settings(sound=False);self.clear_sounds();self.page.clock.run_for(350)
        self.assertEqual(self.state()['voiceCount'],0);self.assertEqual(self.sounds(),[])
        self.settings(sound=True);self.clear_sounds();self.page.clock.run_for(800)
        self.assertGreater(len(self.sounds()),0)
        self.page.evaluate("()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}")
        self.assertEqual(self.state()['voiceCount'],0)
        count=self.page.evaluate('fishingAudioSounds.length');clock=self.state()['clock']
        self.page.clock.run_for(4000)
        self.assertEqual(self.state()['clock'],clock)
        self.assertEqual(self.page.evaluate('fishingAudioSounds.length'),count)
        self.page.evaluate("()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));}")
        self.page.clock.run_for(16)
        self.page.locator('#fishingClose').click(force=True)
        self.assertFalse(self.state()['open']);self.assertEqual(self.state()['voiceCount'],0)
        self.assertIn(self.state()['audioState'],['closed','suspended'])

    def test_autoplay_blocked_audio_does_not_accumulate_voices_and_recovers(self):
        self.page.evaluate('''async()=>{
          const Audio=window.AudioContext||window.webkitAudioContext,context=new Audio();
          await context.suspend();
          const resume=context.resume.bind(context);let attempts=0;
          context.resume=()=>{attempts++;return Promise.resolve();};
          function BlockedAudio(){return context;}
          BlockedAudio.prototype=Audio.prototype;window.AudioContext=BlockedAudio;
          window.fishingAutoplayAttempts=()=>attempts;
          window.restoreFishingAutoplay=()=>{window.AudioContext=Audio;context.resume=resume;};
        }''')
        self.start_exploring();self.clear_sounds();self.page.clock.run_for(30000)
        blocked=self.state()
        self.assertEqual(blocked['audioState'],'suspended')
        self.assertGreater(self.page.evaluate('fishingAutoplayAttempts()'),0)
        self.assertEqual(blocked['voiceCount'],0,'A suspended lake must not retain silent oscillator voices')
        self.assertEqual(blocked['audio']['musicEventsScheduled'],0)
        self.assertEqual(self.sounds(),[])
        self.battle();self.reach_music(2);blocked=self.state()
        self.assertEqual(blocked['audioState'],'suspended')
        self.assertEqual(blocked['voiceCount'],0,'A suspended battle must not queue an unplayable backing track')
        for channel in ['music','metronome','guide']:
            self.assertEqual(blocked['audio'][channel+'EventsScheduled'],0,channel)
        self.assertEqual(self.sounds(),[])
        self.page.evaluate('restoreFishingAutoplay()');unlocked_at=self.state()['clock']
        self.open_audio();self.close_audio();self.clear_sounds();self.reach_music(2)
        recovered=self.state()
        self.assertEqual(recovered['audioState'],'running')
        for channel in ['music','metronome','guide']:
            self.assertGreater(recovered['audio'][channel+'EventsScheduled'],0,channel)
        self.assertTrue(self.sounds())
        self.assertTrue(all(sound['gameTime']>=unlocked_at-.04 for sound in self.sounds()),
            'Unlocking audio must play the current beat without replaying missed music')

    def test_opening_audio_during_a_hold_does_not_break_the_note(self):
        self.battle('2/2');note=next(n for n in self.state()['challenge']['notes']
            if n['judgement']=='pending' and n.get('requiresHold'))
        self.advance_to(note['time']);self.page.locator('#fishingRhythmCanvas').focus()
        self.page.keyboard.down('Space')
        head=self.state()['challenge'];self.assertEqual(len(head['activeHolds']),1)
        self.open_audio();self.page.keyboard.up('Space');frozen=self.state()
        self.page.clock.run_for(3000)
        self.assertEqual(self.state()['clock'],frozen['clock'])
        self.assertEqual(self.state()['challenge']['misses'],head['misses'])
        self.close_audio();self.advance_to(note['holdEndTime'])
        complete=self.state()['challenge']
        self.assertEqual(complete['hits'],head['hits']+1)
        self.assertEqual(complete['misses'],head['misses'])
        self.assertEqual(complete['extras'],head['extras'])

    def test_audio_panel_remains_touch_sized_on_phones_phone(self):
        self.enter();self.open_audio()
        for size in [{'width':390,'height':844},{'width':844,'height':390}]:
            self.page.set_viewport_size(size);self.page.clock.run_for(32)
            panel=self.page.locator('#fishingAudioPanel');box=panel.bounding_box()
            self.assertGreaterEqual(box['x'],0);self.assertLessEqual(box['x']+box['width'],size['width']+1)
            self.assertGreaterEqual(box['y'],0);self.assertLessEqual(box['y']+box['height'],size['height']+1)
            for selector in ['fishingMusic','fishingMetronome','fishingGuide','fishingMasterSound']:
                field=self.page.locator('label').filter(has=self.page.locator('#'+selector))
                self.assertGreaterEqual(field.bounding_box()['height'],44,selector)
            self.assertGreaterEqual(self.page.locator('#fishingAudioClose').bounding_box()['height'],44)
        self.page.screenshot(path='/tmp/coda-fishing36-audio-phone.png')


if __name__=='__main__':unittest.main(verbosity=2)
