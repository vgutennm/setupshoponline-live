"""Check published HTML, crawlable navigation, image references, and structured data."""
import json,re
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.tags=[]; self.scripts=[]; self.json_script=None
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs); self.tags.append((tag,attrs))
        if tag=='script' and attrs.get('type')=='application/ld+json':self.json_script=''
    def handle_data(self, text):
        if self.json_script is not None:self.json_script+=text
    def handle_endtag(self, tag):
        if tag=='script' and self.json_script is not None:
            self.scripts.append(json.loads(self.json_script));self.json_script=None
    def select(self,tag):return [a for t,a in self.tags if t==tag]

root=Path('dist/client'); metadata=json.loads(Path('artifacts/website/src/lib/page-metadata.json').read_text())
catalog=json.loads(Path('artifacts/website/src/lib/catalog.json').read_text())
for route,meta in metadata.items():
    path=root/('index.html' if route=='/' else route.lstrip('/')+'.html')
    text=path.read_text();page=Page(text)
    assert len(page.select('title'))==1,path
    assert len(page.select('main'))==1,path
    assert page.select('h1'),path
    canonical=[a['href'] for a in page.select('link') if a.get('rel')=='canonical']
    assert canonical==['https://setupshoponline.com'+meta.get('canonical',route)],(path,canonical)
    robots=[a['content'] for a in page.select('meta') if a.get('name')=='robots']
    assert len(robots)==1 and robots[0].startswith('noindex' if meta.get('noindex') else 'index'),(path,robots)
    assert len([a for a in page.select('meta') if a.get('name')=='description'])==1,path
    for image in page.select('img'):
        assert 'alt' in image and image['alt'].strip(),(path,image)
        assert image.get('width') and image.get('height'),(path,image)
        src=image.get('src','')
        if src.startswith('/') and not src.startswith('//'):assert (root/src[1:]).is_file(),(path,src)
        if image.get('aria-describedby'):assert any(a.get('id')==image['aria-describedby'] for _,a in page.tags),(path,image)
    if route!='/workbook-access':
        nav=[a for a in page.select('nav') if a.get('aria-label')=='Main navigation']
        assert len(nav)==1 and 'lg:flex' in nav[0].get('class',''),path
        assert 'AI Journey' in text and 'Company' in text,path
        assert any(a.get('href')=='tel:+12017570134' for a in page.select('a')),path
        assert any(a.get('href')=='/free-agentic-readiness-assessment' for a in page.select('a')),path
    assert not re.search(r'(?:more than |over |\b)30(?:\+)? years',text,re.I),path

page=Page((root/'products-services-solutions.html').read_text())
for section in catalog:
    assert any(a.get('id')==section['id'] for _,a in page.tags)
    for offer in section['offers']:
        assert any(a.get('src')==f"/images/offerings/{offer['id']}.webp" and a['alt']==offer['imageAlt'] for a in page.select('img'))
        assert offer['imageDescription'] in (root/'products-services-solutions.html').read_text()
        assert offer['href']==({'workbook':'/free-business-strategy','agentic-readiness':'/free-agentic-readiness-assessment'}.get(offer['id'],'https://calendly.com/meet_with_setupshoponline/15-minute-intro'))

graph=json.loads((root/'llms.json').read_text());assert graph['@context']=='https://schema.org'
ids=[node['@id'] for node in graph['@graph'] if '@id' in node];assert len(ids)==len(set(ids))
assert len(next(n for n in graph['@graph'] if n['@type']=='OfferCatalog')['itemListElement'])==3
xml=ET.parse(root/'sitemap.xml');ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9','i':'http://www.google.com/schemas/sitemap-image/1.1'}
urls=[n.text for n in xml.findall('s:url/s:loc',ns)]
expected=['https://setupshoponline.com'+r for r,m in metadata.items() if not m.get('noindex') and m.get('canonical',r)==r]
assert urls==expected and len(urls)==len(set(urls))
assert len(xml.findall('.//i:image',ns))>=23
for file in ['llms.txt','llms-full.txt']:
    text=(root/file).read_text();assert 'more than 35 years' in text
    assert 'more than 30 years' not in text
print(f'PASS: {len(metadata)} rendered routes, desktop/mobile menu markup, 23 catalog images and descriptions, canonical URLs, robots metadata, JSON-LD, sitemap, and LLM files.')
