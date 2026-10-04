"""Extract declaration candidates from the official offline API, without marking analysis complete."""

import hashlib
import json
import pathlib
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "native/build/reference-cache/unity-discovery"
OUTPUT = ROOT / "native/build/reference-corpus/unity-api-declarations.json"


class Declarations(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.div_depth = 0
        self.capture_depth = None
        self.fragments = []
        self.signatures = []
        self.signature_blocks = 0
        self.empty_signature_blocks = 0

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == "div":
            self.div_depth += 1
            classes = attributes.get("class", "").split()
            if "signature-CS" in classes:
                self.signature_blocks += 1
                self.capture_depth = self.div_depth
                self.fragments = []
        if self.capture_depth is not None and tag in {"br", "p", "h2"}:
            self.fragments.append(" ")

    def handle_endtag(self, tag):
        if tag == "div":
            if self.capture_depth == self.div_depth:
                signature = " ".join("".join(self.fragments).split())
                if signature.startswith("Declaration"):
                    signature = signature[len("Declaration") :].strip()
                if signature:
                    self.signatures.append(signature)
                else:
                    self.empty_signature_blocks += 1
                self.capture_depth = None
            self.div_depth -= 1
        if self.capture_depth is not None and tag in {"h2", "p"}:
            self.fragments.append(" ")

    def handle_data(self, data):
        if self.capture_depth is not None:
            self.fragments.append(data)


def local_cache_path(value):
    # Imported metadata can contain Windows absolute paths; don't build shell commands from them.
    parts = pathlib.PureWindowsPath(value).parts
    start = parts.index("native")
    return ROOT.joinpath(*parts[start:])


def main():
    corpus = json.loads((CACHE / "unity-corpus-manifest.json").read_text(encoding="utf-8"))
    records = []
    absent = []
    for entry in corpus["entries"]:
        if entry["family"] != "scripting_api":
            continue
        if entry["retrieval_status"] != "fetched":
            absent.append({"url": entry["url"], "state": entry["retrieval_status"]})
            continue
        original = local_cache_path(entry["local_body_path"])
        raw = original.read_bytes()
        parser = Declarations()
        parser.feed(raw.decode("utf-8"))
        declarations = list(dict.fromkeys(parser.signatures))
        records.append({
            "url": entry["url"],
            "title": entry["title"],
            "version": entry["source_version"],
            "sourceFile": original.relative_to(ROOT).as_posix(),
            "sourceHash": hashlib.sha256(raw).hexdigest(),
            "signatureCsBlocks": parser.signature_blocks,
            "emptySignatureCsBlocks": parser.empty_signature_blocks,
            "declarationCandidates": [{
                "id": hashlib.sha256((entry["url"] + "\n" + declaration).encode()).hexdigest(),
                "declaration": declaration,
                "locator": "div.signature-CS",
                "state": "extracted_unreviewed",
            } for declaration in declarations],
            "openIssues": ["Actual API owner/module, class/enum/member tables, all overloads and parameter/default/lifecycle/error contracts still require direct analysis."],
            "analysisStatus": "unread",
        })
        if len(records) % 5000 == 0:
            print(f"API sources structurally scanned: {len(records)}", flush=True)
    result = {
        "schemaVersion": 1,
        "baseline": "Unity6000.0/en/job76410965",
        "discoveryClosed": False,
        "fullApiUnitDenominator": None,
        "reviewed": 0,
        "analyzed": 0,
        "verified": 0,
        "counts": {
            "htmlSourcesScanned": len(records),
            "declarationCandidates": sum(len(row["declarationCandidates"]) for row in records),
            "sourcesWithoutDeclarationCandidate": sum(not row["declarationCandidates"] for row in records),
            "sourcesWithoutSignatureCsBlock": sum(row["signatureCsBlocks"] == 0 for row in records),
            "sourcesWithOnlyEmptySignatureCsBlocks": sum(row["signatureCsBlocks"] > 0 and not row["declarationCandidates"] for row in records),
            "emptySignatureCsBlocks": sum(row["emptySignatureCsBlocks"] for row in records),
            "unreachableIndexedUrls": len(absent),
        },
        "pages": records,
        "absent": absent,
        "limitations": "Signature-CS extraction is a structural candidate inventory, not semantic analysis or proof of API completeness. No ledger states are promoted.",
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["counts"]))


if __name__ == "__main__":
    main()
