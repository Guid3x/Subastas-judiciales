import express from "express";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Scrape Thor (Judicial Auctions)
  app.get("/api/scrape-auctions", async (req, res) => {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      
      await page.goto("https://thor.organojudicial.gob.bo/", { 
        waitUntil: "networkidle2",
        timeout: 60000 
      });

      // Try to find and interact with the filters
      await page.evaluate(async () => {
        const findAndSelect = (labelText: string, valueText: string) => {
          const labels = Array.from(document.querySelectorAll('label, span, div'));
          const targetLabel = labels.find(l => l.textContent?.toUpperCase().includes(labelText.toUpperCase()));
          
          if (targetLabel) {
            // Try to find a select near this label
            let parent = targetLabel.parentElement;
            let select = null;
            for (let i = 0; i < 3 && parent; i++) {
              select = parent.querySelector('select');
              if (select) break;
              parent = parent.parentElement;
            }
            
            if (select) {
              const options = Array.from(select.options) as HTMLOptionElement[];
              const targetOption = options.find(o => o.text.toUpperCase().includes(valueText.toUpperCase()));
              if (targetOption) {
                select.value = targetOption.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
            }
          }
          return false;
        };

        const deptFound = findAndSelect('DEPARTAMENTO', 'LA PAZ');
        const typeFound = findAndSelect('TIPO', 'VEHICULO');
        
        if (deptFound || typeFound) {
          // Find search button
          const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn'));
          const searchBtn = buttons.find(b => {
            const text = (b as HTMLElement).innerText || (b as HTMLInputElement).value || '';
            return text.toUpperCase().includes('BUSCAR') || text.toUpperCase().includes('FILTRAR') || text.toUpperCase().includes('CONSULTAR');
          });
          
          if (searchBtn) {
            (searchBtn as HTMLElement).click();
          }
        }
      });

      // Wait for results to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      const auctions: any[] = [];
      
      // Look for tables first
      const tables = $('table');
      if (tables.length > 0) {
        tables.each((ti, table) => {
          $(table).find('tr').each((i, el) => {
            const cells = $(el).find('td');
            if (cells.length >= 8) {
              const rowData = cells.map((ci, cell) => $(cell).text().trim()).get();
              auctions.push({
                id: `auc-${ti}-${i}`,
                clase: rowData[0] || 'VEHICULO',
                tipo: rowData[1] || '',
                marca: rowData[2] || '',
                modelo: rowData[3] || '',
                placa: rowData[4] || '',
                situacionImpositiva: rowData[5] || '',
                expensas: rowData[6] || '',
                proceso: rowData[7] || '',
                valorOriginal: rowData[8] || '',
                fechaPublicacion: rowData[9] || '',
              });
            }
          });
        });
      }

      // If no table results, look for card-like structures
      if (auctions.length === 0) {
        $('.card, .item, .row-item, .publicacion').each((i, el) => {
          const text = $(el).text();
          if (text.includes('Placa') || text.includes('Proceso')) {
            auctions.push({
              id: `card-${i}`,
              clase: 'VEHICULO',
              tipo: $(el).find('.tipo, :contains("Tipo")').first().text().replace(/Tipo:?/i, '').trim(),
              marca: $(el).find('.marca, :contains("Marca")').first().text().replace(/Marca:?/i, '').trim(),
              modelo: $(el).find('.modelo, :contains("Modelo")').first().text().replace(/Modelo:?/i, '').trim(),
              placa: $(el).find('.placa, :contains("Placa")').first().text().replace(/Placa:?/i, '').trim(),
              situacionImpositiva: $(el).find('.situacion, :contains("Situación")').first().text().replace(/Situación:?/i, '').trim(),
              expensas: $(el).find('.expensas, :contains("Expensas")').first().text().replace(/Expensas:?/i, '').trim(),
              proceso: $(el).find('.proceso, :contains("Proceso")').first().text().replace(/Proceso:?/i, '').trim(),
              valorOriginal: $(el).find('.valor, :contains("Valor")').first().text().replace(/Valor:?/i, '').trim(),
              fechaPublicacion: $(el).find('.fecha, :contains("Fecha")').first().text().replace(/Fecha:?/i, '').trim(),
            });
          }
        });
      }

      // Filter out empty rows
      const validAuctions = auctions.filter(a => a.placa || a.proceso);

      res.json({ auctions: validAuctions });
    } catch (error: any) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      if (browser) await browser.close();
    }
  });

  // Scrape RUAT
  app.post("/api/scrape-ruat", async (req, res) => {
    const { placa } = req.body;
    if (!placa) return res.status(400).json({ error: "Placa is required" });

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.goto("https://www.ruat.gob.bo/vehiculos/consultageneral/InicioBusquedaVehiculo.jsf", { waitUntil: "networkidle2" });

      // Find the plate input
      // The user said "no permite el proceso de Control +V", so we use page.type
      // await page.type('#placa_input', placa);
      
      // We need to handle the CAPTCHA. 
      // For a real app, we'd send the CAPTCHA image to the frontend.
      const captchaImage = await page.$eval('#captcha_img', (img: any) => img.src).catch(() => null);
      
      // If we had a CAPTCHA solver or user input, we'd proceed.
      // For now, let's return the CAPTCHA to the frontend if needed.
      
      res.json({ 
        message: "RUAT scraping requires CAPTCHA handling",
        captchaImage,
        // placeholder data
        details: {
          tipo: "Automóvil",
          cilindrada: "1600cc",
          color: "Blanco",
          puertas: "4"
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    } finally {
      if (browser) await browser.close();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
