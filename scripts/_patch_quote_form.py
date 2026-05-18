from pathlib import Path

p = Path(__file__).resolve().parents[1] / "frontend/src/components/quotes/quote-form.tsx"
t = p.read_text(encoding="utf-8")
block = """
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div>
          <label className="mb-1 block text-sm font-medium">
            Ritenuta d&apos;acconto %
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={withholdingTaxPercent}
            onChange={(e) => setWithholdingTaxPercent(e.target.value)}
            placeholder="es. 20"
          />
        </motion.div>
        <motion.div>
          <label className="mb-1 block text-sm font-medium">Ritenuta importo (€)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={withholdingTaxAmount}
            onChange={(e) => setWithholdingTaxAmount(e.target.value)}
          />
        </motion.div>
        <motion.div>
          <label className="mb-1 block text-sm font-medium">Marca da bollo (€)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={stampDutyAmount}
            onChange={(e) => setStampDutyAmount(e.target.value)}
            placeholder="es. 2"
          />
        </motion.div>
      </motion.div>

"""
# Fix accidental motion.div in block - use plain div tags
block = block.replace("motion.div", "DIVTAG")
block = block.replace("DIVTAG", "div")
needle = '      />\n\n      <div>\n        <motion.div className="mb-3 flex'
needle = '      />\n\n      <div>\n        <div className="mb-3 flex'
replacement = "      />\n\n" + block + '      <div>\n        <div className="mb-3 flex'
if needle not in t:
    raise SystemExit("needle not found")
t = t.replace(needle, replacement, 1)
p.write_text(t, encoding="utf-8")
print("patched")
