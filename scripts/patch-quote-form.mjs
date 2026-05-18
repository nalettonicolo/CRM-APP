import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, "../frontend/src/components/quotes/quote-form.tsx");
let t = fs.readFileSync(p, "utf8");
const D = "div";
const blockClean = `
      <${D} className="grid gap-4 sm:grid-cols-3">
        <${D}>
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
        </${D}>
        <${D}>
          <label className="mb-1 block text-sm font-medium">Ritenuta importo (€)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={withholdingTaxAmount}
            onChange={(e) => setWithholdingTaxAmount(e.target.value)}
          />
        </${D}>
        <${D}>
          <label className="mb-1 block text-sm font-medium">Marca da bollo (€)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={stampDutyAmount}
            onChange={(e) => setStampDutyAmount(e.target.value)}
            placeholder="es. 2"
          />
        </${D}>
      </${D}>

`;
const re = /(\s*\/>\s*\r?\n\s*<div>\s*\r?\n\s*<div className="mb-3 flex flex-col)/;
if (!re.test(t)) throw new Error("needle not found");
t = t.replace(re, `\n${blockClean}      <${D}>\n        <${D} className="mb-3 flex flex-col`);
fs.writeFileSync(p, t);
console.log("ok");
