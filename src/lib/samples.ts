export interface SampleImage {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl?: string;
  generateDataUrl?: () => string;
}

/**
 * Creates high-resolution canvas sample images for testing the WhatFontIs pipeline immediately.
 */
export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'sample-whatfontis-paloma',
    name: 'Paloma (Captura WhatFontIs)',
    category: 'Ejemplo Real WhatFontIs',
    description: 'La imagen exacta de ejemplo de WhatFontIs con el texto «Paloma» en fondo oscuro.',
    imageUrl: '/samples/media_1794439248555_6272541f.png',
  },
  {
    id: 'sample-paloma',
    name: 'Paloma (Cursiva Nítida)',
    category: 'Cursiva conectada',
    description: 'Texto cursivo como en el ejemplo de WhatFontIs. Ideal para probar las líneas de corte.',
    generateDataUrl: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Dark teal background (like WhatFontIs sample 2)
      ctx.fillStyle = '#2c4356';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Light cursive text
      ctx.font = 'italic bold 160px "Brush Script MT", "Segoe Script", "Dancing Script", cursive';
      ctx.fillStyle = '#f5f5f7';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.fillText('Paloma', canvas.width / 2, canvas.height / 2 + 10);

      return canvas.toDataURL('image/png');
    },
  },
  {
    id: 'sample-alphabet',
    name: 'Alfabeto Manuscrito (A-M)',
    category: 'Alfabeto manuscrito',
    description: 'Abecedario en recuadros como la extensión de Illustrator (Fontself). Varias letras juntas.',
    generateDataUrl: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 340;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // White paper background
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Baseline guide line
      ctx.strokeStyle = '#e2dfd8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 240);
      ctx.lineTo(1160, 240);
      ctx.stroke();

      // Bold handwritten letters
      ctx.font = 'bold 96px "Marker Felt", "Comic Sans MS", "Chalkboard SE", sans-serif';
      ctx.fillStyle = '#1c1b1a';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'center';

      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
      const step = 1100 / letters.length;
      letters.forEach((char, i) => {
        const x = 70 + i * step;
        ctx.fillText(char, x, 240);
      });

      return canvas.toDataURL('image/png');
    },
  },
  {
    id: 'sample-illustrator-sheet',
    name: 'Alfabeto Illustrator (A-Z)',
    category: 'Extensión Illustrator',
    description: 'Hoja de letras manuscritas A-Z del tutorial de la extensión de Illustrator.',
    imageUrl: '/samples/media_1794440119378_cbf98251.png',
  },
  {
    id: 'sample-words',
    name: 'Vintage Serif (Design)',
    category: 'Tipografía clásica',
    description: 'Texto estilizado de alto contraste para recorte y creación de fuente clásica.',
    generateDataUrl: () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 130px "Georgia", "Times New Roman", serif';
      ctx.fillStyle = '#111827';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText('CREATIVE', canvas.width / 2, canvas.height / 2);

      return canvas.toDataURL('image/png');
    },
  },
];
