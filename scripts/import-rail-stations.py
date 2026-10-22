"""Offline import of the official NaPTAN 910 XML export; never fetch at runtime."""
import hashlib
import json
import re
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

source = Path(sys.argv[1])
root = ET.parse(source).getroot()
ns = {"n": "http://www.naptan.org.uk/"}
stations = set()
for stop in root.findall(".//n:StopPoint", ns):
    if stop.get("Status") != "active":
        continue
    for ref in stop.findall(".//n:AnnotatedRailRef", ns):
        code = ref.findtext("n:CrsRef", namespaces=ns)
        name = ref.findtext("n:StationName", namespaces=ns)
        if code and re.fullmatch("[A-Z]{3}", code) and name:
            stations.add((code, re.sub(r" Rail Station$", "", name)))
rows = [{"name": name, "crs": code} for code, name in sorted(stations)]
assert len(rows) > 2500, "Incomplete station reference; preserving existing file"
for name, code in [("Heath High Level", "HHL"), ("Heath Low Level", "HLL"), ("Cardiff Central", "CDF"), ("Cardiff Queen Street", "CDQ")]:
    assert {"name": name, "crs": code} in rows
snapshot = {"source_url": "https://naptan.api.dft.gov.uk/v1/access-nodes?atcoAreaCodes=910&dataFormat=xml", "source_modified_at": root.get("ModificationDateTime"), "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "attribution": "Contains public sector information licensed under the Open Government Licence v3.0. Source: Department for Transport (NaPTAN).", "stations": rows}
Path("src/rail/stations.json").write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")
print(f"Imported {len(rows)} station references")
