"""Inspect real Web Audio scheduling for repeating DJ selections and cleanup."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
from world_navigation_helpers import open_destination

_spec = importlib.util.spec_from_file_location('jukebox_loop_world', Path(__file__).with_name('learning-world-browser.py'))
_world = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_world)


class JukeboxLoopTests(_world.WorldBrowserCase):
    def setUp(self):
        super().setUp()
        self.page.evaluate('''()=>{
          const Audio=window.AudioContext||window.webkitAudioContext;
          window.jukeboxAudioProbe={contexts:[],starts:[],cancels:[]};
          const create=Audio.prototype.createOscillator;
          Audio.prototype.createOscillator=function(...args){
            const probe=window.jukeboxAudioProbe;
            let context=probe.contexts.indexOf(this);
            if(context<0){context=probe.contexts.length;probe.contexts.push(this);}
            const oscillator=create.apply(this,args),start=oscillator.start,stop=oscillator.stop;
            oscillator.start=function(when,...rest){probe.starts.push({context,when,frequency:this.frequency.value,type:this.type});return start.call(this,when,...rest);};
            oscillator.stop=function(...times){if(!times.length)probe.cancels.push(context);return stop.apply(this,times);};
            return oscillator;
          };
        }''')
        open_destination(self.page, 'dj')

    def state(self):
        return self.page.evaluate('CodaArcadeQA.jukebox()')

    def probe(self):
        return self.page.evaluate('''()=>({starts:jukeboxAudioProbe.starts,cancels:jukeboxAudioProbe.cancels,
          contexts:jukeboxAudioProbe.contexts.map(context=>({state:context.state,time:context.currentTime}))})''')

    def import_song(self, name='Loop fixture', pitch=60):
        song={'bpm':240,'bars':1,'meter':'4/4','root':0,'scale':'chromatic',
              'tracks':[{'id':1,'name':'Loop voice','sound':1,'volume':.3,'mute':False,
                         'notes':[{'p':pitch,'t':0,'d':4},{'p':pitch+7,'t':8,'d':4}]}],
              'drums':[{'sound':0,'volume':.2,'mute':False,'notes':[]} for _ in range(3)]}
        self.page.locator('#djSongImport').set_input_files({'name':name+'.json','mimeType':'application/json','buffer':json.dumps(song).encode()})
        button=self.page.get_by_role('button',name='Play '+name,exact=True)
        button.wait_for()
        return button

    def test_music_queues_matching_cycles_on_exact_audio_boundaries(self):
        self.import_song().click()
        self.page.wait_for_function('CodaArcadeQA.jukebox().cyclesScheduled>=2')
        state=self.state();probe=self.probe()
        self.assertTrue(state['playing']);self.assertTrue(state['looping'])
        self.assertEqual(state['title'],'Loop fixture');self.assertAlmostEqual(state['duration'],1)
        self.assertEqual(len(probe['contexts']),1,'A repeat must reuse the running audio context')
        starts=probe['starts'];self.assertGreaterEqual(len(starts),4)
        for first,second in zip(starts[:2],starts[2:4]):
            self.assertAlmostEqual(second['when']-first['when'],state['duration'],delta=1e-8)
            self.assertEqual(second['frequency'],first['frequency'])
        self.assertIn('Looping',self.page.locator('.panelMsg').inner_text())
        self.assertEqual(self.page.locator('#musicBtn').get_attribute('aria-pressed'),'true')
        self.page.locator('#jukeboxStop').click()

    def test_escape_keeps_music_playing_and_header_stop_prevents_restart(self):
        self.import_song().click()
        self.page.wait_for_function('CodaArcadeQA.jukebox().looping')
        self.page.keyboard.press('Escape')
        self.assertTrue(self.page.locator('#panel').is_hidden())
        self.assertTrue(self.state()['playing'],'Leaving the DJ dialogue must keep its selection playing')
        self.page.locator('#musicBtn').click()
        self.page.wait_for_function('!CodaArcadeQA.jukebox().playing')
        self.assertEqual(self.page.locator('#musicBtn').get_attribute('aria-pressed'),'false')
        stopped=self.probe();self.assertEqual(stopped['contexts'][0]['state'],'closed')
        self.assertGreater(len(stopped['cancels']),0,'Queued future voices must be canceled')
        self.page.wait_for_timeout(1200)
        self.assertEqual(self.probe()['starts'],stopped['starts'],'A stopped scheduler must not restart at the loop boundary')
        self.assertFalse(self.state()['playing'])

    def test_replacing_song_closes_previous_context_and_dj_stop_cancels_new_loop(self):
        self.import_song('First loop',60).click()
        self.page.wait_for_function('CodaArcadeQA.jukebox().title==="First loop"&&CodaArcadeQA.jukebox().cyclesScheduled>=2')
        original=self.probe()['starts'][:]
        self.import_song('Second loop',62).click()
        self.page.wait_for_function('CodaArcadeQA.jukebox().title==="Second loop"&&CodaArcadeQA.jukebox().cyclesScheduled>=2')
        replaced=self.probe()
        self.assertEqual(len(replaced['contexts']),2)
        self.assertEqual(replaced['contexts'][0]['state'],'closed')
        self.assertEqual(replaced['contexts'][1]['state'],'running')
        self.assertIn(0,replaced['cancels'])
        self.assertNotEqual(replaced['starts'][-1]['frequency'],original[-1]['frequency'])
        self.page.locator('#jukeboxStop').click()
        self.page.wait_for_function('!CodaArcadeQA.jukebox().playing')
        stopped=self.probe()
        self.assertTrue(all(context['state']=='closed' for context in stopped['contexts']))
        self.assertIn(1,stopped['cancels'])
        self.page.wait_for_timeout(1200)
        self.assertEqual(self.probe()['starts'],stopped['starts'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
