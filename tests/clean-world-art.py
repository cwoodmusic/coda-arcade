"""Read-only checks for the cleaned pixel-art assets (requires Pillow)."""
from pathlib import Path
import hashlib
import json
import unittest

from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
COUCH=json.loads((ROOT/'scripts/dance-couch-repair.json').read_text())

def couch_contains(x,y):
    # Test pixel centres, with a half-pixel allowance for Canvas edge coverage.
    def inside(px,py):
        hit=False
        for a,b in zip(COUCH['polygon'],COUCH['polygon'][1:]+COUCH['polygon'][:1]):
            if (a[1]>py)!=(b[1]>py) and px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0]:
                hit=not hit
        return hit
    return any(inside(x+dx,y+dy) for dx in (.01,.5,.99) for dy in (.01,.5,.99))

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
        bx,by,bw,bh=COUCH['foreground']['bounds']
        for y in range(by,by+bh):
            for x in range(bx,bx+bw):
                if couch_contains(x,y):allowed[y*width+x]=1
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
                bx,by,_,_=COUCH['foreground']['bounds']
                ax,ay,aw,ah=COUCH['foreground']['atlas']
                if ax<=x<ax+aw and ay<=y<ay+ah and couch_contains(bx+x-ax,by+y-ay):
                    self.assertEqual(new[3],255,'The repaired sofa must lift as one complete object')
                    continue
                self.assertTrue(any(bx<=x<bx+w and by<=y<by+h for bx,by,w,h in allowed),(x,y))
                self.assertEqual(new[3],0,'Cleanup must not grow new occluding regions')
                removed+=1
        self.assertGreater(removed,100)

    def test_repaired_sofa_arm_and_base_fit_the_existing_movable_atlas_entry(self):
        world=Image.open(ROOT/'coda_arcade_world_clean.png').convert('RGBA')
        atlas=Image.open(ROOT/'coda_arcade_foreground_clean.png').convert('RGBA')
        with Image.open(ROOT/COUCH['source']) as source:
            self.assertEqual(list(source.size),COUCH['sourceSize'])
        bx,by,bw,bh=COUCH['foreground']['bounds'];ax,ay,aw,ah=COUCH['foreground']['atlas']
        self.assertEqual((bw,bh),(aw,ah))
        self.assertTrue(all(bx<=x<=bx+bw and by<=y<=by+bh for x,y in COUCH['polygon']))
        # These right-arm/base pixels were outside the old cropped silhouette.
        for x,y in [(700,672),(700,688),(689,696),(675,690),(635,674)]:
            with self.subTest(point=(x,y)):
                self.assertTrue(couch_contains(x,y))
                self.assertEqual(atlas.getpixel((ax+x-bx,ay+y-by)),world.getpixel((x,y)))
                self.assertEqual(atlas.getpixel((ax+x-bx,ay+y-by))[3],255)

    def test_couch_repair_changes_no_other_world_or_atlas_pixels(self):
        bx,by,bw,bh=COUCH['foreground']['bounds'];ax,ay,_,_=COUCH['foreground']['atlas']
        for name,key in [('coda_arcade_world_clean.png','outsideWorldSha256'),
                         ('coda_arcade_foreground_clean.png','outsideAtlasSha256')]:
            with self.subTest(asset=name):
                image=Image.open(ROOT/name).convert('RGBA');data=bytearray(image.tobytes())
                for y in range(by,by+bh):
                    for x in range(bx,bx+bw):
                        if not couch_contains(x,y):continue
                        px,py=(x,y) if 'world_clean' in name else (ax+x-bx,ay+y-by)
                        at=(py*image.width+px)*4;data[at:at+4]=b'\0'*4
                self.assertEqual(hashlib.sha256(data).hexdigest(),COUCH[key],
                                 'Every pixel outside the tiny sofa repair must retain its reviewed value')

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
