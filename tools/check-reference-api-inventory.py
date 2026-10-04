import importlib.util
import pathlib
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("reference_inventory", pathlib.Path(__file__).with_name("reference-api-inventory.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class InventoryChecks(unittest.TestCase):
    def test_signatures_preserve_generic_types_defaults_and_nested_markup(self):
        parser = module.Declarations()
        parser.feed('''<div class="signature"><div class="signature-CS sig-block"><h2>Declaration</h2>
        public T <span>Build&lt;T&gt;</span>(<a>List&lt;T&gt;</a> values, int count = 3);
        </div><div class="signature-CS sig-block"><h2>Declaration</h2>public T Build&lt;T&gt;();</div></div>''')
        self.assertEqual(parser.signatures, ["public T Build<T>(List<T> values, int count = 3);", "public T Build<T>();"])

    def test_examples_navigation_and_other_language_tabs_are_not_declarations(self):
        parser = module.Declarations()
        parser.feed('''<h1>Function</h1><pre class="codeExampleCS">void Example() { Build(); }</pre>
        <div class="signature-JS">function Build();</div><div class="signature-CS sig-block">public void Build();</div>''')
        self.assertEqual(parser.signatures, ["public void Build();"])

    def test_signature_with_nested_div_does_not_end_at_inner_boundary(self):
        parser = module.Declarations()
        parser.feed('<div class="signature-CS"><div><h2>Declaration</h2>public bool Has</div>(int value);</div>')
        self.assertEqual(parser.signatures, ["public bool Has(int value);"])

    def test_empty_declaration_slot_is_distinct_from_missing_signature_block(self):
        empty = module.Declarations()
        empty.feed('<div class="signature-CS"><h2>Declaration</h2></div>')
        absent = module.Declarations()
        absent.feed('<h1>Class overview</h1><p>Members are in a separate table.</p>')
        self.assertEqual(empty.signatures, [])
        self.assertEqual(absent.signatures, [])
        self.assertEqual((empty.signature_blocks, empty.empty_signature_blocks), (1, 1))
        self.assertEqual((absent.signature_blocks, absent.empty_signature_blocks), (0, 0))


if __name__ == "__main__":
    unittest.main()
