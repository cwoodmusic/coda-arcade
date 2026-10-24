"""Read-only checks for the cleaned pixel-art assets (requires Pillow)."""
from pathlib import Path
import json
import unittest

from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
def pixels(image):
    return image.get_flattened_data() if hasattr(image,'get_flattened_data') else image.getdata()


class CleanWorldArtTests(unittest.TestCase):
    def test_original_grid_and_art_are_unchanged_outside_authorized_repairs(self):
        original=Image.open(ROOT/'coda_arcade_phase86_approved_world.png').convert('RGB')
        clean=Image.open(ROOT/'coda_arcade_world_clean.png').convert('RGB')
        metadata=json.loads((ROOT/'scripts/clean-world-regions.json').read_text())
        self.assertEqual(original.size,(1672,941));self.assertEqual(clean.size,original.size)
        self.assertEqual(len(metadata['regions']),33)
        width,height=clean.size;padding=metadata['padding'];allowed=bytearray(width*height)
        for region in metadata['regions']:
            x,y,w,h=region['bounds']
            for row in range(max(0,y-padding),min(height,y+h+padding)):
                start=row*width+max(0,x-padding);end=row*width+min(width,x+w+padding)
                allowed[start:end]=b'\x01'*(end-start)
        plant_repairs=json.loads((ROOT/'scripts/dance-plant-repairs.json').read_text())
        for region in plant_repairs['allowedRegions']:
            x,y,w,h=region['bounds']
            for row in range(y,y+h):
                allowed[row*width+x:row*width+x+w]=b'\x01'*w
        changed=0
        for index,(old,new) in enumerate(zip(pixels(original),pixels(clean))):
            if old!=new:
                self.assertTrue(allowed[index],f'Unrelated pixel changed at {index%width},{index//width}')
                changed+=1
        self.assertGreater(changed,50000,'The original characters must actually be removed')

    def test_foreground_keeps_atlas_layout_and_existing_occlusion_silhouettes(self):
        original=Image.open(ROOT/'coda_arcade_phase892_foreground.png').convert('RGBA')
        clean=Image.open(ROOT/'coda_arcade_foreground_clean.png').convert('RGBA')
        self.assertEqual(original.size,(2048,880));self.assertEqual(clean.size,original.size)
        # Only former head protrusions above these counters may lose mask alpha.
        allowed=[(546,3,64,37),(848,3,64,24),(1428,3,64,21),
                 (933,280,67,90),(370,530,65,72)]
        removed=0
        for index,(old,new) in enumerate(zip(pixels(original),pixels(clean))):
            if old[3]!=new[3]:
                x,y=index%2048,index//2048
                self.assertTrue(any(bx<=x<bx+w and by<=y<by+h for bx,by,w,h in allowed),(x,y))
                self.assertEqual(new[3],0,'Cleanup must not grow new occluding regions')
                removed+=1
        self.assertGreater(removed,100)

    def test_all_four_pictured_plants_are_removed_from_the_rebuilt_art(self):
        original=Image.open(ROOT/'coda_arcade_phase86_approved_world.png').convert('RGB')
        clean=Image.open(ROOT/'coda_arcade_world_clean.png').convert('RGB')
        # These boxes exclude the fifth palm that was outside the screenshot.
        boxes=[(696,547,763,637),(661,601,727,683),(798,524,837,601),(754,609,824,683)]
        green=lambda image:sum(g>r*1.12 and g>b*1.08 and g>65 for r,g,b in pixels(image))
        for box in boxes:
            with self.subTest(box=box):
                self.assertGreater(green(original.crop(box)),45)
                self.assertLess(green(clean.crop(box)),10,'No foliage should remain')
        atlas=Image.open(ROOT/'coda_arcade_foreground_clean.png').convert('RGBA')
        for box in [(933,280,1000,370),(370,530,435,602)]:
            self.assertEqual(atlas.crop(box).getchannel('A').getbbox(),None,
                             'Removed foreground plants must not repaint the repair')


if __name__=='__main__':
    unittest.main(verbosity=2)
