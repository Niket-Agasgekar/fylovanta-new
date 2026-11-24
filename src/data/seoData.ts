import { BRAND } from '../config/brand';
import { isToolDisabled } from '../config/features';

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface RelatedConverterLink {
  slug: string;
  title: string;
  anchorText: string;
  description: string;
}

export interface ConverterSeoConfig {
  slug: string;
  name: string;
  category: 'image' | 'pdf' | 'video' | 'audio' | 'compress' | 'utility';
  sourceFormat?: string;
  targetFormat?: string;
  pageTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  keywords: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  howToSteps: string[];
  features: string[];
  faqData: SeoFaqItem[];
  relatedConverters: RelatedConverterLink[];
}

export const DOMAIN_URL = `https://${BRAND.domain}`;

export const CONVERTER_SEO_CONFIGS: Record<string, ConverterSeoConfig> = {
  'jpg-to-png': {
    slug: 'jpg-to-png',
    name: 'JPG to PNG',
    category: 'image',
    sourceFormat: 'jpg',
    targetFormat: 'png',
    pageTitle: 'Free JPG to PNG Converter — Convert Images Online | Fylovanta',
    metaDescription: 'Convert JPG images to lossless PNG free online with Fylovanta. Upload your JPG files and download crisp PNG results directly in your browser.',
    h1: 'Free JPG to PNG Converter',
    intro: 'Transform standard JPEG images into high-fidelity, lossless PNG graphics free in your browser. Preserve pixel precision, color depth, and sharpness with no account required.',
    keywords: ['free jpg to png', 'jpg to png converter', 'convert jpg to png online', 'lossless png converter', 'free image converter'],
    canonicalUrl: `${DOMAIN_URL}/jpg-to-png`,
    ogTitle: 'Free JPG to PNG Converter | Fylovanta',
    ogDescription: 'Convert JPG images to PNG free and privately in your browser with Fylovanta.',
    howToSteps: [
      'Upload your JPG or JPEG images by dragging them into the dropzone or clicking "Browse Files".',
      'Optionally customize output dimensions or apply high-fidelity smoothing in advanced settings.',
      'Click "Convert Now" to process locally and download your crisp PNG instantly.'
    ],
    features: [
      'Free lossless 24-bit PNG rendering with true color fidelity',
      'Batch conversion of multiple JPEG files into ZIP archive',
      'In-browser client-side execution with no signup'
    ],
    faqData: [
      {
        question: 'Will converting a JPG to PNG improve image quality?',
        answer: 'Converting to PNG creates a lossless image container that prevents any further compression artifacts, making it ideal for editing, archiving, or graphic design work.'
      },
      {
        question: 'Does Fylovanta support batch JPG to PNG conversion?',
        answer: 'Yes. You can drop multiple JPG photos simultaneously, convert them in parallel, and download them either individually or as a single ZIP archive.'
      },
      {
        question: 'Is my image uploaded to any external server?',
        answer: 'No. Fylovanta renders your JPG to PNG locally within your browser sandbox using HTML5 Canvas and native image decoders for privacy-conscious handling.'
      },
      {
        question: 'Do I need a subscription or account to convert JPG to PNG?',
        answer: 'No. This JPG to PNG converter is free to use online with no signup, subscription, or watermarks. Practical file sizes depend on your browser and device memory.'
      }
    ],
    relatedConverters: [
      { slug: 'png-to-jpg', title: 'PNG to JPG', anchorText: 'Convert PNG to JPG', description: 'Compress PNG graphics into lightweight JPGs' },
      { slug: 'jpg-to-webp', title: 'JPG to WebP', anchorText: 'Convert JPG to WebP', description: 'Upgrade JPGs to modern WebP format for fast websites' },
      { slug: 'webp-to-jpg', title: 'WebP to JPG', anchorText: 'Convert WebP to JPG', description: 'Transform WebP images to universal JPG format' },
      { slug: 'heic-to-jpg', title: 'HEIC to JPG', anchorText: 'Convert HEIC to JPG', description: 'Convert Apple iPhone HEIC photos to JPG' },
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert JPG to PDF Document', description: 'Combine JPG images into a single clean PDF' },
      { slug: 'compress-image', title: 'Compress Image', anchorText: 'Compress JPG Images', description: 'Reduce JPG file size up to 80% with minimal loss' }
    ]
  },

  'png-to-jpg': {
    slug: 'png-to-jpg',
    name: 'PNG to JPG',
    category: 'image',
    sourceFormat: 'png',
    targetFormat: 'jpg',
    pageTitle: 'Free PNG to JPG Converter — Optimize PNG Images | Fylovanta',
    metaDescription: 'Convert PNG images to lightweight JPG photos free in your browser with Fylovanta. Adjust JPEG quality and download instantly.',
    h1: 'Free PNG to JPG Converter',
    intro: 'Convert heavy PNG graphics into lightweight, widely compatible JPG images free online. Adjust JPEG quality to balance visual sharpness and smaller file sizes.',
    keywords: ['free png to jpg', 'png to jpg converter', 'png to jpeg online', 'shrink png to jpg', 'free image converter'],
    canonicalUrl: `${DOMAIN_URL}/png-to-jpg`,
    ogTitle: 'Free PNG to JPG Converter | Fylovanta',
    ogDescription: 'Convert PNG images to JPG free online in your browser with Fylovanta.',
    howToSteps: [
      'Select or drop your PNG files into the converter area.',
      'Adjust the quality slider to balance visual crispness and file size reduction.',
      'Click "Convert Now" to generate optimized JPG photos ready to share.'
    ],
    features: [
      'Configurable JPEG compression from 10% to 100% quality',
      'Clean background matting for transparent PNG graphics',
      'Instant batch conversion and one-click ZIP download'
    ],
    faqData: [
      {
        question: 'What happens to transparency when converting PNG to JPG?',
        answer: 'Since the JPEG format does not support alpha transparency, transparent areas are automatically composited onto a clean, solid white background.'
      },
      {
        question: 'How much file size will I save by converting to JPG?',
        answer: 'Typically, complex photographic PNGs can be reduced by 60% to 85% in file size when converted to a 90% quality JPG.'
      },
      {
        question: 'Can I convert multiple PNG files at once?',
        answer: 'Yes, Fylovanta processes multiple files in batch and allows you to download them individually or as a single neatly organized ZIP archive.'
      },
      {
        question: 'Do my files remain secure and private?',
        answer: 'Yes. All image processing takes place directly in your browser without transmitting your photos to remote storage servers.'
      }
    ],
    relatedConverters: [
      { slug: 'jpg-to-png', title: 'JPG to PNG', anchorText: 'Convert JPG to PNG', description: 'Convert JPGs to transparent lossless PNG graphics' },
      { slug: 'png-to-webp', title: 'PNG to WebP', anchorText: 'Convert PNG to WebP', description: 'Shrink PNGs while keeping full alpha transparency' },
      { slug: 'png-to-pdf', title: 'PNG to PDF', anchorText: 'Convert PNG to PDF', description: 'Merge PNG graphics into a professional PDF document' },
      { slug: 'compress-image', title: 'Compress Image', anchorText: 'Compress PNG Images', description: 'Optimize PNG file sizes without changing formats' }
    ]
  },

  'heic-to-jpg': {
    slug: 'heic-to-jpg',
    name: 'HEIC to JPG',
    category: 'image',
    sourceFormat: 'heic',
    targetFormat: 'jpg',
    pageTitle: 'Free HEIC to JPG Converter — Apple Photos Online | Fylovanta',
    metaDescription: 'Convert Apple HEIC and HEIF photos from compatible browsers into universal JPG images free online with Fylovanta.',
    h1: 'Free HEIC to JPG Converter',
    intro: 'Convert Apple iOS HEIC photos into universally compatible JPG images in supported browsers. View and share iPhone pictures on Windows, Android, or older viewers cleanly.',
    keywords: ['free heic to jpg', 'convert heic to jpg online', 'heif to jpg', 'iphone photo converter', 'apple heic converter'],
    canonicalUrl: `${DOMAIN_URL}/heic-to-jpg`,
    ogTitle: 'Free HEIC to JPG Converter | Fylovanta',
    ogDescription: 'Convert Apple HEIC photos to JPG format free online with Fylovanta.',
    howToSteps: [
      'Drop your iPhone .HEIC or .HEIF files into the upload card.',
      'Choose JPG as your output format.',
      'Click "Convert Now" to produce universal JPEG photos ready to share anywhere.'
    ],
    features: [
      'Native support for modern Apple HEIC/HEIF containers',
      'Preserves original EXIF metadata and photo orientation',
      'Client-side decoding with zero cloud uploading required'
    ],
    faqData: [
      {
        question: 'Why does my iPhone save photos as HEIC?',
        answer: 'HEIC (High Efficiency Image Container) is Apple\'s modern photo format designed to save storage space. However, many Windows PCs and older programs cannot open HEIC files without converting to JPG.'
      },
      {
        question: 'Will converting HEIC to JPG lose photo quality?',
        answer: 'Fylovanta renders HEIC files at maximum resolution and 92%+ JPEG quality, keeping colors, details, and clarity virtually identical to the original.'
      },
      {
        question: 'Can I convert HEIC photos directly on my phone or tablet?',
        answer: 'Yes, Fylovanta works seamlessly on mobile browsers, iPadOS, iOS Safari, and Android Chrome.'
      }
    ],
    relatedConverters: [
      { slug: 'jpg-to-png', title: 'JPG to PNG', anchorText: 'Convert JPG to PNG', description: 'Convert JPGs to crisp lossless PNGs' },
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert Photos to PDF', description: 'Compile iPhone pictures into a clean PDF document' },
      { slug: 'compress-image', title: 'Compress Image', anchorText: 'Compress Photos', description: 'Shrink photo sizes for faster email sharing' }
    ]
  },

  'webp-to-jpg': {
    slug: 'webp-to-jpg',
    name: 'WebP to JPG',
    category: 'image',
    sourceFormat: 'webp',
    targetFormat: 'jpg',
    pageTitle: 'Free WebP to JPG Converter — Convert WebP Online | Fylovanta',
    metaDescription: 'Convert WebP images into standard JPG photos free directly in your browser with Fylovanta. No signup or software needed.',
    h1: 'Free WebP to JPG Converter',
    intro: 'Transform WebP graphics into standard JPG images compatible with desktop photo editors, legacy viewers, and print tools—free in your browser.',
    keywords: ['free webp to jpg', 'convert webp to jpg online', 'webp to jpeg', 'save webp as jpg'],
    canonicalUrl: `${DOMAIN_URL}/webp-to-jpg`,
    ogTitle: 'Free WebP to JPG Converter | Fylovanta',
    ogDescription: 'Convert WebP images to JPG free online with Fylovanta.',
    howToSteps: [
      'Upload your .webp images into the dropzone.',
      'Set your preferred JPG quality setting.',
      'Click "Convert Now" to generate high-resolution JPG files.'
    ],
    features: ['Ultra-fast decoding', 'Full browser support', 'Batch conversion support'],
    faqData: [
      {
        question: 'Why do websites use WebP instead of JPG?',
        answer: 'WebP offers superior compression for websites, but desktop applications and older photo viewers frequently require standard JPG files.'
      },
      {
        question: 'How fast is the WebP to JPG conversion?',
        answer: 'Because processing is executed directly in your browser with hardware-accelerated canvas decoders, conversions usually finish in less than 1 second.'
      }
    ],
    relatedConverters: [
      { slug: 'jpg-to-webp', title: 'JPG to WebP', anchorText: 'Convert JPG to WebP', description: 'Convert standard JPGs to modern WebP graphics' },
      { slug: 'png-to-jpg', title: 'PNG to JPG', anchorText: 'Convert PNG to JPG', description: 'Convert PNG images to lightweight JPGs' },
      { slug: 'jpg-to-png', title: 'JPG to PNG', anchorText: 'Convert JPG to PNG', description: 'Convert JPGs to lossless PNGs' }
    ]
  },

  'jpg-to-webp': {
    slug: 'jpg-to-webp',
    name: 'JPG to WebP',
    category: 'image',
    sourceFormat: 'jpg',
    targetFormat: 'webp',
    pageTitle: 'Free JPG to WebP Converter — Smaller Web Images | Fylovanta',
    metaDescription: 'Convert JPG photos to lightweight WebP format free in your browser with Fylovanta to reduce image weight for faster websites.',
    h1: 'Free JPG to WebP Converter',
    intro: 'Optimize web graphics by converting standard JPG photos into modern WebP files free in your browser—no subscription or account needed.',
    keywords: ['free jpg to webp', 'convert jpg to webp online', 'jpeg to webp', 'compress for web'],
    canonicalUrl: `${DOMAIN_URL}/jpg-to-webp`,
    ogTitle: 'Free JPG to WebP Converter | Fylovanta',
    ogDescription: 'Convert JPG images to WebP format free with Fylovanta.',
    howToSteps: [
      'Drop your JPG/JPEG files into the uploader.',
      'Select output quality level for optimal web compression.',
      'Download lightweight WebP files ready for instant website deployment.'
    ],
    features: ['Smaller file sizes', 'Faster page loading', 'Maintains rich visual details'],
    faqData: [
      {
        question: 'Are WebP images supported by all modern browsers?',
        answer: 'Yes, over 97% of global web browsers including Chrome, Safari, Firefox, and Edge natively support WebP images.'
      }
    ],
    relatedConverters: [
      { slug: 'webp-to-jpg', title: 'WebP to JPG', anchorText: 'Convert WebP to JPG', description: 'Convert WebP back to universal JPG' },
      { slug: 'png-to-webp', title: 'PNG to WebP', anchorText: 'Convert PNG to WebP', description: 'Convert transparent PNGs to lightweight WebP' },
      { slug: 'compress-image', title: 'Compress Image', anchorText: 'Compress Web Images', description: 'Shrink image payloads for faster web loading' }
    ]
  },

  'png-to-webp': {
    slug: 'png-to-webp',
    name: 'PNG to WebP',
    category: 'image',
    sourceFormat: 'png',
    targetFormat: 'webp',
    pageTitle: 'Free PNG to WebP Converter — Keep Transparency | Fylovanta',
    metaDescription: 'Convert transparent PNG graphics into compact WebP images free in your browser with Fylovanta while preserving alpha transparency.',
    h1: 'Free PNG to WebP Converter',
    intro: 'Convert heavy transparent PNG logos, icons, and illustrations into compact WebP files free online with full alpha channel preservation.',
    keywords: ['free png to webp', 'convert png to webp online', 'transparent webp converter', 'web image optimization'],
    canonicalUrl: `${DOMAIN_URL}/png-to-webp`,
    ogTitle: 'Free PNG to WebP Converter | Fylovanta',
    ogDescription: 'Convert PNG images to WebP free with transparency preserved.',
    howToSteps: [
      'Upload your transparent or opaque PNG graphics.',
      'Choose your target quality setting.',
      'Download super-light WebP images with full transparency preserved.'
    ],
    features: ['Retains alpha transparency', 'Up to 70% smaller than PNG', 'Batch processing'],
    faqData: [
      {
        question: 'Does WebP support transparent backgrounds like PNG?',
        answer: 'Yes, WebP supports full 8-bit alpha channel transparency just like PNG, but at a fraction of the file size.'
      }
    ],
    relatedConverters: [
      { slug: 'jpg-to-png', title: 'JPG to PNG', anchorText: 'Convert JPG to PNG', description: 'Convert JPG photos to PNG graphics' },
      { slug: 'png-to-jpg', title: 'PNG to JPG', anchorText: 'Convert PNG to JPG', description: 'Convert PNG graphics to JPG' },
      { slug: 'compress-image', title: 'Compress Image', anchorText: 'Compress Image Files', description: 'Optimize image storage' }
    ]
  },

  'image-converter': {
    slug: 'image-converter',
    name: 'Universal Image Converter',
    category: 'image',
    pageTitle: 'Free Online Image Converter — JPG, PNG, WebP & More | Fylovanta',
    metaDescription: 'Convert between JPG, PNG, WebP, GIF, BMP, SVG, ICO, and AVIF image formats free in your browser with Fylovanta. No signup required.',
    h1: 'Free Online Image Converter',
    intro: 'Convert supported image formats free inside your browser with straightforward control over quality, pixel dimensions, and transparency.',
    keywords: ['free image converter', 'convert images online free', 'all in one image converter', 'free photo converter'],
    canonicalUrl: `${DOMAIN_URL}/image-converter`,
    ogTitle: 'Free Online Image Converter | Fylovanta',
    ogDescription: 'Convert between major image formats free online with Fylovanta.',
    howToSteps: [
      'Upload any image in JPG, PNG, WebP, GIF, BMP, SVG, or ICO format.',
      'Pick your desired target format from the format picker.',
      'Click "Convert Now" and download your converted graphics instantly.'
    ],
    features: ['Supports 10+ image formats', 'Advanced resizing & color settings', 'Zero quality degradation'],
    faqData: [
      {
        question: 'What image formats does Fylovanta support?',
        answer: 'Fylovanta supports JPG, JPEG, PNG, WebP, GIF, BMP, SVG, ICO, AVIF, HEIC, and TIFF image formats.'
      }
    ],
    relatedConverters: [
      { slug: 'jpg-to-png', title: 'JPG to PNG', anchorText: 'Convert JPG to PNG', description: 'Lossless PNG conversion' },
      { slug: 'png-to-jpg', title: 'PNG to JPG', anchorText: 'Convert PNG to JPG', description: 'Lightweight JPG conversion' },
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert Images to PDF', description: 'Create PDF documents from photos' }
    ]
  },

  'jpg-to-pdf': {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'pdf',
    sourceFormat: 'jpg',
    targetFormat: 'pdf',
    pageTitle: 'Free JPG to PDF Converter — Combine Photos to PDF | Fylovanta',
    metaDescription: 'Convert JPG images to PDF documents free online with Fylovanta. Combine multiple JPG or PNG pictures into a multi-page PDF right in your browser.',
    h1: 'Free JPG to PDF Converter',
    intro: 'Turn photos, scanned receipts, and illustrations into printable PDF documents free in your browser. Combine and reorder multiple images in seconds.',
    keywords: ['free jpg to pdf', 'convert jpg to pdf online', 'images to pdf free', 'combine photos to pdf'],
    canonicalUrl: `${DOMAIN_URL}/jpg-to-pdf`,
    ogTitle: 'Free JPG to PDF Converter | Fylovanta',
    ogDescription: 'Combine JPG images into a printable PDF document free with Fylovanta.',
    howToSteps: [
      'Upload one or more JPG or PNG images into the converter.',
      'Choose page dimensions (A4, Letter, Auto) and orientation (Portrait/Landscape).',
      'Click "Convert Now" to compile your photos into a single PDF document.'
    ],
    features: ['Multi-image compilation into 1 PDF', 'A4 & US Letter page standard support', 'Preserves high-DPI image clarity'],
    faqData: [
      {
        question: 'Can I combine multiple JPG files into a single PDF?',
        answer: 'Yes! Select or drop multiple images at once, and Fylovanta will automatically assemble them sequentially into a single multi-page PDF document.'
      },
      {
        question: 'Can I customize margins and page orientation?',
        answer: 'Yes, use the advanced settings modal to select Portrait, Landscape, or Auto orientation, along with custom page margins.'
      }
    ],
    relatedConverters: [
      { slug: 'pdf-to-jpg', title: 'PDF to JPG', anchorText: 'Convert PDF to JPG Images', description: 'Extract pages from PDF as JPG photos' },
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge Multiple PDFs', description: 'Combine separate PDF files into one' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF Files', description: 'Reduce PDF file size for emailing' }
    ]
  },

  'png-to-pdf': {
    slug: 'png-to-pdf',
    name: 'PNG to PDF',
    category: 'pdf',
    sourceFormat: 'png',
    targetFormat: 'pdf',
    pageTitle: 'Free PNG to PDF Converter — Turn PNGs into PDF | Fylovanta',
    metaDescription: 'Convert PNG graphics and scans into multi-page PDF documents free in your browser with Fylovanta. Custom page sizing and margins included.',
    h1: 'Free PNG to PDF Converter',
    intro: 'Create printable PDF documents from PNG graphics, screenshots, and scans free inside your browser without uploading to cloud storage.',
    keywords: ['free png to pdf', 'convert png to pdf online', 'png to pdf converter', 'free pdf maker'],
    canonicalUrl: `${DOMAIN_URL}/png-to-pdf`,
    ogTitle: 'Free PNG to PDF Converter | Fylovanta',
    ogDescription: 'Convert PNG images to PDF documents free online with Fylovanta.',
    howToSteps: [
      'Upload your PNG images into the dropzone.',
      'Configure paper size, orientation, and margins.',
      'Download your finished PDF document.'
    ],
    features: ['Lossless PNG rasterization', 'Custom page geometry', 'Fast in-browser assembly'],
    faqData: [
      {
        question: 'Does PNG to PDF maintain sharp graphics?',
        answer: 'Yes, Fylovanta embeds original high-resolution pixel buffers directly into the PDF stream to ensure maximum sharpness when printed.'
      }
    ],
    relatedConverters: [
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert JPG to PDF', description: 'Combine JPG photos to PDF' },
      { slug: 'pdf-to-png', title: 'PDF to PNG', anchorText: 'Convert PDF to PNG', description: 'Extract PDF pages as PNG images' },
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF Files', description: 'Combine multiple PDF files' }
    ]
  },

  'pdf-to-jpg': {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    category: 'pdf',
    sourceFormat: 'pdf',
    targetFormat: 'jpg',
    pageTitle: 'Free PDF to JPG Converter — Save PDF Pages as Images | Fylovanta',
    metaDescription: 'Convert PDF pages into crisp JPG images free directly in your browser with Fylovanta. Download individual pages or a ZIP archive with no signup.',
    h1: 'Free PDF to JPG Converter',
    intro: 'Extract and convert every page of your PDF documents into high-resolution JPG images free in your browser—ready for slides, forms, and previews.',
    keywords: ['free pdf to jpg', 'convert pdf to jpg online', 'pdf to images free', 'extract pdf pages'],
    canonicalUrl: `${DOMAIN_URL}/pdf-to-jpg`,
    ogTitle: 'Free PDF to JPG Converter | Fylovanta',
    ogDescription: 'Convert PDF documents to crisp JPG images free in your browser with Fylovanta.',
    howToSteps: [
      'Drop your PDF document into the upload area.',
      'Select JPG output format.',
      'Click "Convert Now" to extract pages as crystal-clear JPG photos.'
    ],
    features: ['High-DPI page rendering', 'Extract all pages at once', 'Batch download as ZIP archive'],
    faqData: [
      {
        question: 'Can I extract multi-page PDFs?',
        answer: 'Yes. Every page of your document is rendered at high resolution and packaged into your download.'
      },
      {
        question: 'Are my confidential documents uploaded anywhere?',
        answer: 'No. Fylovanta renders PDF pages locally in your browser so your sensitive files never leave your computer.'
      }
    ],
    relatedConverters: [
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert JPG to PDF', description: 'Create PDF from JPG photos' },
      { slug: 'pdf-to-png', title: 'PDF to PNG', anchorText: 'Convert PDF to PNG', description: 'Extract PDF pages as lossless PNGs' },
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF Documents', description: 'Combine separate PDFs into one' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF Files', description: 'Shrink PDF file size' }
    ]
  },

  'pdf-to-png': {
    slug: 'pdf-to-png',
    name: 'PDF to PNG',
    category: 'pdf',
    sourceFormat: 'pdf',
    targetFormat: 'png',
    pageTitle: 'Free PDF to PNG Converter — Crisp Lossless Pages | Fylovanta',
    metaDescription: 'Convert PDF document pages into lossless PNG images free right inside your browser with Fylovanta. Ideal for crisp text and diagrams.',
    h1: 'Free PDF to PNG Converter',
    intro: 'Render PDF document pages as crisp, lossless PNG graphics free in your browser with sharp text and diagram clarity.',
    keywords: ['free pdf to png', 'convert pdf to png online', 'pdf pages to png', 'extract pdf graphics'],
    canonicalUrl: `${DOMAIN_URL}/pdf-to-png`,
    ogTitle: 'Free PDF to PNG Converter | Fylovanta',
    ogDescription: 'Convert PDF pages into lossless PNG images free online with Fylovanta.',
    howToSteps: [
      'Upload your PDF file.',
      'Choose PNG format.',
      'Download sharp PNG images of your document pages.'
    ],
    features: ['Lossless image quality', 'High rendering resolution', 'Private local processing'],
    faqData: [
      {
        question: 'Why choose PNG over JPG for PDF extraction?',
        answer: 'PNG uses lossless compression, which prevents compression artifacts around fine text, technical blueprints, and vector charts.'
      }
    ],
    relatedConverters: [
      { slug: 'pdf-to-jpg', title: 'PDF to JPG', anchorText: 'Convert PDF to JPG', description: 'Extract PDF pages as JPG photos' },
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert JPG to PDF', description: 'Combine images into a PDF' },
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF Files', description: 'Combine PDF documents' }
    ]
  },

  'merge-pdf': {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    category: 'utility',
    sourceFormat: 'pdf',
    targetFormat: 'pdf',
    pageTitle: 'Free Merge PDF Tool — Combine PDF Files Online | Fylovanta',
    metaDescription: 'Merge and reorder multiple PDF files into one organized document free in your browser with Fylovanta. No signup or watermarks.',
    h1: 'Free Merge PDF Tool',
    intro: 'Combine multiple PDF files into one organized document free in your browser. Drag, reorder, and join reports, invoices, or handouts cleanly.',
    keywords: ['free merge pdf', 'combine pdf files free', 'join pdf documents online', 'free pdf merger'],
    canonicalUrl: `${DOMAIN_URL}/merge-pdf`,
    ogTitle: 'Free Merge PDF Tool | Fylovanta',
    ogDescription: 'Combine and reorder multiple PDF files into one document free with Fylovanta.',
    howToSteps: [
      'Upload two or more PDF files you want to combine.',
      'Reorder PDF files into your preferred sequence.',
      'Click "Convert Now" to assemble them into one merged PDF file.'
    ],
    features: ['Fast browser document merging', 'Preserves vector text and fonts', 'Privacy-conscious local execution'],
    faqData: [
      {
        question: 'Is there a subscription or file cap to merge PDFs?',
        answer: 'Merging PDFs is free with no account required. Because the merger runs directly in your browser memory, practical size depends on your device RAM rather than a subscription limit.'
      },
      {
        question: 'Will my PDF quality or vector text be degraded?',
        answer: 'No. Fylovanta operates directly on the PDF object tree, preserving original vector text, embedded fonts, and artwork.'
      }
    ],
    relatedConverters: [
      { slug: 'split-pdf', title: 'Split PDF', anchorText: 'Split PDF Pages', description: 'Separate pages from large PDF files' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF Files', description: 'Reduce PDF file size' },
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert JPG to PDF', description: 'Create PDF from photos' }
    ]
  },

  'split-pdf': {
    slug: 'split-pdf',
    name: 'Split PDF',
    category: 'utility',
    sourceFormat: 'pdf',
    targetFormat: 'pdf',
    pageTitle: 'Free Split PDF Tool — Extract Pages from PDF | Fylovanta',
    metaDescription: 'Split PDF files and extract custom page ranges into separate PDF documents free in your browser with Fylovanta. No signup required.',
    h1: 'Free Split PDF Tool',
    intro: 'Extract individual pages or custom page ranges (such as 1-3, 5) from large PDF documents free inside your browser.',
    keywords: ['free split pdf', 'extract pdf pages free', 'separate pdf online', 'free pdf splitter'],
    canonicalUrl: `${DOMAIN_URL}/split-pdf`,
    ogTitle: 'Free Split PDF Tool | Fylovanta',
    ogDescription: 'Extract pages from PDF documents free in your browser with Fylovanta.',
    howToSteps: [
      'Upload your PDF file.',
      'Specify the page range to extract (e.g. "1-5" or "1, 3, 7").',
      'Download your extracted PDF document.'
    ],
    features: ['Custom page ranges', 'Keeps original page fidelity', 'No software installation required'],
    faqData: [
      {
        question: 'How do I specify page ranges to split?',
        answer: 'You can enter ranges like "1-3" for pages 1 through 3, or comma-separated lists like "1, 4, 8".'
      }
    ],
    relatedConverters: [
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF Files', description: 'Combine separate PDF documents' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF Files', description: 'Reduce PDF file size' },
      { slug: 'pdf-to-jpg', title: 'PDF to JPG', anchorText: 'Convert PDF to JPG', description: 'Extract pages as images' }
    ]
  },

  'compress-image': {
    slug: 'compress-image',
    name: 'Image Compressor',
    category: 'compress',
    sourceFormat: 'jpg',
    targetFormat: 'jpg',
    pageTitle: 'Free Image Compressor — Shrink JPG, PNG & WebP | Fylovanta',
    metaDescription: 'Compress JPG, PNG, and WebP photos free in your browser with Fylovanta. Reduce image weight for email and web sharing with adjustable quality.',
    h1: 'Free Online Image Compressor',
    intro: 'Reduce image file sizes free in your browser for faster websites, email attachments, and cleaner storage while keeping crisp visual detail.',
    keywords: ['free image compressor', 'compress jpg free', 'compress png online', 'shrink photo size'],
    canonicalUrl: `${DOMAIN_URL}/compress-image`,
    ogTitle: 'Free Image Compressor | Fylovanta',
    ogDescription: 'Compress JPG, PNG, and WebP images free and locally with Fylovanta.',
    howToSteps: [
      'Drag and drop your images into the compression box.',
      'Adjust the compression slider (balanced 80% default).',
      'Download your optimized, lightweight images.'
    ],
    features: ['Up to 80% file size reduction', 'Retains visual fidelity', 'Batch compression & ZIP export'],
    faqData: [
      {
        question: 'How much can I reduce image file size?',
        answer: 'Most high-resolution photos can be reduced by 50% to 80% in file size with negligible visible difference on screens.'
      },
      {
        question: 'Can I compress PNG and WebP files too?',
        answer: 'Yes, Fylovanta compresses JPG, PNG, WebP, and other raster image formats.'
      }
    ],
    relatedConverters: [
      { slug: 'jpg-to-webp', title: 'JPG to WebP', anchorText: 'Convert JPG to WebP', description: 'Upgrade images to next-gen WebP format' },
      { slug: 'png-to-jpg', title: 'PNG to JPG', anchorText: 'Convert PNG to JPG', description: 'Compress PNGs into lightweight JPGs' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF Documents', description: 'Reduce PDF document file sizes' }
    ]
  },

  'compress-pdf': {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    category: 'compress',
    sourceFormat: 'pdf',
    targetFormat: 'pdf',
    pageTitle: 'Free Compress PDF Tool — Reduce PDF File Size | Fylovanta',
    metaDescription: 'Compress PDF files free in your browser with Fylovanta. Shrink bulky documents for email and web uploads with adjustable compression presets.',
    h1: 'Free Compress PDF Tool',
    intro: 'Optimize and shrink heavy PDF documents free in your browser while preserving readable text and clear graphics.',
    keywords: ['free compress pdf', 'reduce pdf size free', 'shrink pdf online', 'free pdf compressor'],
    canonicalUrl: `${DOMAIN_URL}/compress-pdf`,
    ogTitle: 'Free Compress PDF Tool | Fylovanta',
    ogDescription: 'Reduce PDF file size free right inside your browser with Fylovanta.',
    howToSteps: [
      'Upload your heavy PDF document.',
      'Select compression level (Medium recommended).',
      'Download your optimized, smaller PDF.'
    ],
    features: ['Stream & image optimization', 'Maintains vector structure where possible', '100% private in-browser compression'],
    faqData: [
      {
        question: 'How does PDF compression work in my browser?',
        answer: 'Fylovanta first applies lossless object-stream optimization locally, and when needed re-encodes dense page rasters using adjustable DPI compression presets directly in your browser without uploading your document.'
      }
    ],
    relatedConverters: [
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF Documents', description: 'Combine multiple PDFs into one' },
      { slug: 'split-pdf', title: 'Split PDF', anchorText: 'Split PDF Pages', description: 'Extract specific pages from PDF' },
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert JPG to PDF', description: 'Create PDF from photos' }
    ]
  },

  'mp4-to-mp3': {
    slug: 'mp4-to-mp3',
    name: 'MP4 to MP3',
    category: 'audio',
    sourceFormat: 'mp4',
    targetFormat: 'mp3',
    pageTitle: 'MP4 to MP3 Converter — Extract Audio from Video | Fylovanta',
    metaDescription: 'Extract MP3 or WAV audio tracks from MP4, MOV, and WebM video clips when server-side media transcoding is enabled on Fylovanta.',
    h1: 'MP4 to MP3 Converter',
    intro: 'Extract the soundtrack, dialogue, or music from MP4 videos and save it as a high-bitrate MP3 or WAV audio file when server-side media transcoding is enabled.',
    keywords: ['mp4 to mp3', 'extract audio from video', 'convert video to mp3', 'mp4 audio extractor'],
    canonicalUrl: `${DOMAIN_URL}/mp4-to-mp3`,
    ogTitle: 'MP4 to MP3 Converter | Fylovanta',
    ogDescription: 'Extract crisp MP3 audio from MP4 videos when media tools are enabled on Fylovanta.',
    howToSteps: [
      'Upload your MP4 video clip.',
      'Select your preferred audio bitrate (128kbps to 320kbps).',
      'Download your converted MP3 audio track.'
    ],
    features: ['Clean audio track demuxing', 'Configurable audio bitrate', 'Temporary server-side FFmpeg processing when enabled'],
    faqData: [
      {
        question: 'What audio quality can I expect from MP4 to MP3?',
        answer: 'Fylovanta extracts the underlying PCM/AAC audio channel at original sampling rate and encodes to MP3 up to 320 kbps for pristine sound fidelity.'
      }
    ],
    relatedConverters: [
      { slug: 'video-to-gif', title: 'Video to GIF', anchorText: 'Convert Video to GIF', description: 'Turn video clips into animated GIFs' },
      { slug: 'mov-to-mp4', title: 'MOV to MP4', anchorText: 'Convert MOV to MP4', description: 'Convert Apple MOV videos to MP4' },
      { slug: 'audio-converter', title: 'Audio Converter', anchorText: 'Convert Between Audio Formats', description: 'Convert MP3, WAV, OGG, and AAC' }
    ]
  },

  'mov-to-mp4': {
    slug: 'mov-to-mp4',
    name: 'MOV to MP4',
    category: 'video',
    sourceFormat: 'mov',
    targetFormat: 'mp4',
    pageTitle: 'MOV to MP4 Converter — Convert QuickTime Video | Fylovanta',
    metaDescription: 'Convert Apple QuickTime MOV recordings into universally playable H.264 MP4 video when media tools are enabled on Fylovanta.',
    h1: 'MOV to MP4 Converter',
    intro: 'Convert iPhone and QuickTime .MOV video recordings into standard .MP4 video files compatible with Windows, Android, and web players when server-side media tools are enabled.',
    keywords: ['mov to mp4', 'convert mov to mp4', 'quicktime to mp4', 'apple video converter'],
    canonicalUrl: `${DOMAIN_URL}/mov-to-mp4`,
    ogTitle: 'MOV to MP4 Converter | Fylovanta',
    ogDescription: 'Convert MOV videos to MP4 format when media tools are enabled on Fylovanta.',
    howToSteps: [
      'Upload your .MOV video file.',
      'Select MP4 as target format.',
      'Download your universal MP4 video.'
    ],
    features: ['Universal video playback', 'Maintains frame rate and aspect ratio', 'Automatic temp file cleanup when media transcoding is enabled'],
    faqData: [
      {
        question: 'Why convert MOV to MP4?',
        answer: 'MP4 is the universal standard for video playback across virtually all web browsers, TVs, smartphones, and media players.'
      }
    ],
    relatedConverters: [
      { slug: 'mp4-to-mp3', title: 'MP4 to MP3', anchorText: 'Extract Audio as MP3', description: 'Extract sound from video' },
      { slug: 'video-to-gif', title: 'Video to GIF', anchorText: 'Convert Video to GIF', description: 'Turn video clips into GIFs' },
      { slug: 'compress-video', title: 'Compress Video', anchorText: 'Compress Video Files', description: 'Reduce video file size' }
    ]
  },

  'video-to-gif': {
    slug: 'video-to-gif',
    name: 'Video to GIF',
    category: 'video',
    sourceFormat: 'mp4',
    targetFormat: 'gif',
    pageTitle: 'Video to GIF Converter — Create Animated GIFs | Fylovanta',
    metaDescription: 'Turn MP4, WebM, and MOV video clips into animated GIFs with FPS and width controls when media tools are enabled on Fylovanta.',
    h1: 'Video to GIF Converter',
    intro: 'Create smooth, animated GIF memes and product demos from MP4, WebM, and MOV video clips with frame rate and resolution controls.',
    keywords: ['video to gif', 'mp4 to gif', 'convert video to animated gif', 'gif maker online'],
    canonicalUrl: `${DOMAIN_URL}/video-to-gif`,
    ogTitle: 'Video to GIF Converter | Fylovanta',
    ogDescription: 'Convert video clips into animated GIFs quickly with Fylovanta.',
    howToSteps: [
      'Upload a short MP4, WebM, or MOV video clip.',
      'Set your desired frame rate (10-24 fps) and width in settings.',
      'Download your animated GIF.'
    ],
    features: ['Custom frame rate control', 'Adaptive palette color quantization', 'Looping animation export'],
    faqData: [
      {
        question: 'How can I make the GIF smaller?',
        answer: 'You can lower the frame rate to 10 fps or scale the GIF width to 480px in advanced options to reduce the output file size.'
      }
    ],
    relatedConverters: [
      { slug: 'mp4-to-mp3', title: 'MP4 to MP3', anchorText: 'Extract MP3 Audio', description: 'Extract sound from video clips' },
      { slug: 'mov-to-mp4', title: 'MOV to MP4', anchorText: 'Convert MOV to MP4', description: 'Convert QuickTime videos to MP4' },
      { slug: 'compress-image', title: 'Compress Image', anchorText: 'Compress GIF Graphics', description: 'Optimize GIF file size' }
    ]
  },

  'mp3-converter': {
    slug: 'mp3-converter',
    name: 'MP3 Converter',
    category: 'audio',
    targetFormat: 'mp3',
    pageTitle: 'MP3 Converter — Convert Audio & Video to MP3 | Fylovanta',
    metaDescription: 'Convert WAV, OGG, M4A, AAC, FLAC, and video tracks into MP3 audio when media tools are enabled on Fylovanta.',
    h1: 'MP3 Converter',
    intro: 'Convert supported audio recordings, voice memos, or music tracks into universal MP3 format with configurable bitrate settings when media tools are enabled.',
    keywords: ['mp3 converter', 'convert to mp3', 'audio to mp3', 'wav to mp3'],
    canonicalUrl: `${DOMAIN_URL}/mp3-converter`,
    ogTitle: 'MP3 Converter | Fylovanta',
    ogDescription: 'Convert audio files to MP3 format when media tools are enabled on Fylovanta.',
    howToSteps: [
      'Upload your audio file in WAV, OGG, AAC, or M4A format.',
      'Select output bitrate (e.g. 192k or 320k).',
      'Download your MP3 audio track.'
    ],
    features: ['High-bitrate MP3 encoding', 'Broad audio format compatibility', 'Automatic temp cleanup after server processing'],
    faqData: [
      {
        question: 'What bitrates are supported for MP3?',
        answer: 'Fylovanta supports bitrates from 64 kbps (voice optimized) up to 320 kbps (studio master quality).'
      }
    ],
    relatedConverters: [
      { slug: 'wav-converter', title: 'WAV Converter', anchorText: 'Convert to WAV Audio', description: 'Lossless studio WAV converter' },
      { slug: 'mp4-to-mp3', title: 'MP4 to MP3', anchorText: 'Extract MP3 from Video', description: 'Extract soundtrack from video' },
      { slug: 'audio-converter', title: 'Audio Converter', anchorText: 'Universal Audio Converter', description: 'Convert across all audio types' }
    ]
  },

  'wav-converter': {
    slug: 'wav-converter',
    name: 'WAV Converter',
    category: 'audio',
    targetFormat: 'wav',
    pageTitle: 'WAV Converter — Convert Audio to Uncompressed WAV | Fylovanta',
    metaDescription: 'Convert MP3, OGG, and audio files to uncompressed 16-bit PCM WAV audio on Fylovanta.',
    h1: 'WAV Converter',
    intro: 'Convert compressed audio files into uncompressed, 16-bit PCM WAV audio files ready for music production, editing, and sound design.',
    keywords: ['wav converter', 'convert to wav', 'mp3 to wav', 'lossless audio converter'],
    canonicalUrl: `${DOMAIN_URL}/wav-converter`,
    ogTitle: 'WAV Converter | Fylovanta',
    ogDescription: 'Convert audio to studio WAV format online with Fylovanta.',
    howToSteps: [
      'Upload your audio recording.',
      'Select WAV as your target format.',
      'Download clean, uncompressed 16-bit PCM WAV audio.'
    ],
    features: ['Studio 16-bit RIFF PCM format', 'Original sampling frequency preservation', 'Zero loss of audio details'],
    faqData: [
      {
        question: 'Is WAV audio lossless?',
        answer: 'Yes, WAV stores uncompressed PCM audio waveforms, ensuring full frequency response with zero compression artifacts.'
      }
    ],
    relatedConverters: [
      { slug: 'mp3-converter', title: 'MP3 Converter', anchorText: 'Convert Audio to MP3', description: 'Universal MP3 audio converter' },
      { slug: 'mp4-to-mp3', title: 'MP4 to MP3', anchorText: 'Extract Audio from Video', description: 'Extract audio track from MP4' },
      { slug: 'compress-audio', title: 'Compress Audio', anchorText: 'Compress Audio Tracks', description: 'Reduce audio file size' }
    ]
  },

  'audio-converter': {
    slug: 'audio-converter',
    name: 'Audio Converter',
    category: 'audio',
    pageTitle: 'Audio Converter — MP3, WAV, OGG, AAC & More | Fylovanta',
    metaDescription: 'Convert across MP3, WAV, OGG, M4A, AAC, and FLAC audio formats when media tools are enabled on Fylovanta.',
    h1: 'Audio Converter',
    intro: 'Convert voice recordings, podcasts, and audio tracks across major audio formats with custom channel and sample rate controls when media tools are enabled.',
    keywords: ['audio converter', 'convert audio online', 'music converter', 'sound file converter'],
    canonicalUrl: `${DOMAIN_URL}/audio-converter`,
    ogTitle: 'Audio Converter | Fylovanta',
    ogDescription: 'Convert across audio formats when media tools are enabled on Fylovanta.',
    howToSteps: [
      'Upload your audio track.',
      'Choose your desired format (MP3, WAV, OGG, AAC, etc.).',
      'Download your converted audio file.'
    ],
    features: ['Supports 6+ audio formats', 'Stereo and mono channel support', 'Automatic temp cleanup after server processing'],
    faqData: [
      {
        question: 'What audio formats are supported?',
        answer: 'When server-side media transcoding is enabled, Fylovanta supports MP3, WAV, OGG Vorbis, AAC, M4A, and WebM Audio.'
      }
    ],
    relatedConverters: [
      { slug: 'mp3-converter', title: 'MP3 Converter', anchorText: 'Convert to MP3', description: 'Convert audio to MP3' },
      { slug: 'wav-converter', title: 'WAV Converter', anchorText: 'Convert to WAV', description: 'Convert audio to uncompressed WAV' },
      { slug: 'compress-audio', title: 'Compress Audio', anchorText: 'Compress Audio Files', description: 'Shrink audio sizes' }
    ]
  },

  'video-converter': {
    slug: 'video-converter',
    name: 'Video Converter',
    category: 'video',
    pageTitle: 'Video Converter — MP4, WebM, MOV, GIF & More | Fylovanta',
    metaDescription: 'Convert video files across MP4, WebM, MOV, AVI, MKV, and animated GIF when media tools are enabled on Fylovanta.',
    h1: 'Video Converter',
    intro: 'Convert video recordings, screen captures, and clips across MP4, WebM, MOV, and GIF with resolution and frame rate adjustments when media tools are enabled.',
    keywords: ['video converter', 'convert video online', 'mp4 converter', 'webm converter'],
    canonicalUrl: `${DOMAIN_URL}/video-converter`,
    ogTitle: 'Video Converter | Fylovanta',
    ogDescription: 'Convert video formats when media tools are enabled on Fylovanta.',
    howToSteps: [
      'Upload your video clip.',
      'Choose output format (MP4, WebM, GIF, MP3).',
      'Download your converted video.'
    ],
    features: ['Resolution scaling', 'Quality presets', 'Automatic temp cleanup after server processing'],
    faqData: [
      {
        question: 'What video formats can I convert?',
        answer: 'When server-side media transcoding is enabled, Fylovanta supports MP4, WebM, QuickTime MOV, and animated GIF.'
      }
    ],
    relatedConverters: [
      { slug: 'mov-to-mp4', title: 'MOV to MP4', anchorText: 'Convert MOV to MP4', description: 'Convert Apple MOV to MP4' },
      { slug: 'video-to-gif', title: 'Video to GIF', anchorText: 'Convert Video to GIF', description: 'Create animated GIFs' },
      { slug: 'mp4-to-mp3', title: 'MP4 to MP3', anchorText: 'Extract Audio as MP3', description: 'Extract audio from video' }
    ]
  },

  'mp4-converter': {
    slug: 'mp4-converter',
    name: 'MP4 Converter',
    category: 'video',
    targetFormat: 'mp4',
    pageTitle: 'MP4 Converter — Convert Video to H.264 MP4 | Fylovanta',
    metaDescription: 'Convert MOV, AVI, MKV, and WebM recordings into universally compatible H.264 MP4 format when media tools are enabled on Fylovanta.',
    h1: 'MP4 Converter',
    intro: 'Convert QuickTime MOV, WebM, AVI, and MKV video recordings into standard MP4 files compatible across desktop browsers, mobile devices, and editors.',
    keywords: ['mp4 converter', 'convert to mp4', 'mov to mp4', 'webm to mp4'],
    canonicalUrl: `${DOMAIN_URL}/mp4-converter`,
    ogTitle: 'MP4 Converter | Fylovanta',
    ogDescription: 'Convert supported video formats to MP4 with Fylovanta.',
    howToSteps: [
      'Upload your source video file (MOV, WebM, AVI, or MKV).',
      'Choose resolution and encoding quality in Settings.',
      'Download your converted MP4 file.'
    ],
    features: ['Standard H.264 MP4 output', 'Resolution scaling presets', 'Automatic temp cleanup after download'],
    faqData: [
      {
        question: 'Which video formats can be converted to MP4?',
        answer: 'When server-side media transcoding is enabled, Fylovanta accepts MOV, WebM, AVI, MKV, and MP4 recordings.'
      }
    ],
    relatedConverters: [
      { slug: 'mov-to-mp4', title: 'MOV to MP4', anchorText: 'Convert MOV to MP4', description: 'Convert QuickTime MOV recordings to MP4' },
      { slug: 'video-converter', title: 'Video Converter', anchorText: 'Universal Video Converter', description: 'Convert across MP4, WebM, and GIF' },
      { slug: 'compress-video', title: 'Compress Video', anchorText: 'Compress Video Files', description: 'Shrink video file sizes' }
    ]
  },

  'compress-video': {
    slug: 'compress-video',
    name: 'Video Compressor',
    category: 'compress',
    sourceFormat: 'mp4',
    targetFormat: 'mp4',
    pageTitle: 'Video Compressor — Reduce MP4 & WebM File Size | Fylovanta',
    metaDescription: 'Compress MP4, WebM, and MOV videos with smart resolution scaling and H.264 optimization when media tools are enabled on Fylovanta.',
    h1: 'Video Compressor',
    intro: 'Shrink video file sizes by adjusting bitrate, resolution, and frame rate when server-side media tools are enabled.',
    keywords: ['compress video', 'reduce video size', 'shrink mp4', 'video optimizer online'],
    canonicalUrl: `${DOMAIN_URL}/compress-video`,
    ogTitle: 'Video Compressor | Fylovanta',
    ogDescription: 'Compress video files when media tools are enabled on Fylovanta.',
    howToSteps: [
      'Upload your video file.',
      'Select compression quality preset.',
      'Download your lightweight video.'
    ],
    features: ['Targeted size reduction', 'Resolution downscaling options', 'Automatic temp cleanup after server processing'],
    faqData: [
      {
        question: 'How much can video file size be reduced?',
        answer: 'Depending on original resolution, video files can often be compressed by 40% to 75%.'
      }
    ],
    relatedConverters: [
      { slug: 'mov-to-mp4', title: 'MOV to MP4', anchorText: 'Convert MOV to MP4', description: 'Convert Apple videos to MP4' },
      { slug: 'video-to-gif', title: 'Video to GIF', anchorText: 'Convert Video to GIF', description: 'Turn clips into GIFs' },
      { slug: 'compress-image', title: 'Compress Image', anchorText: 'Compress Images', description: 'Shrink photo file sizes' }
    ]
  },

  'compress-audio': {
    slug: 'compress-audio',
    name: 'Audio Compressor',
    category: 'compress',
    sourceFormat: 'mp3',
    targetFormat: 'mp3',
    pageTitle: 'Audio Compressor — Reduce MP3 & WAV Audio Size | Fylovanta',
    metaDescription: 'Compress MP3 and audio tracks by optimizing bitrate and channels when media tools are enabled on Fylovanta.',
    h1: 'Audio Compressor',
    intro: 'Reduce audio file sizes by optimizing encoding bitrates and channel setups while preserving vocal and music clarity.',
    keywords: ['compress audio', 'shrink mp3', 'reduce audio size', 'audio optimizer'],
    canonicalUrl: `${DOMAIN_URL}/compress-audio`,
    ogTitle: 'Audio Compressor | Fylovanta',
    ogDescription: 'Compress audio tracks online with Fylovanta.',
    howToSteps: [
      'Upload your audio file.',
      'Select an optimized bitrate (e.g. 128k).',
      'Download your compact audio file.'
    ],
    features: ['Flexible bitrate selection', 'Stereo and mono optimization', 'Fast audio transcoding'],
    faqData: [
      {
        question: 'Does compressing audio change the sound quality?',
        answer: 'Setting a 128 kbps to 192 kbps bitrate produces significant size reductions while sounding virtually identical on standard headphones.'
      }
    ],
    relatedConverters: [
      { slug: 'mp3-converter', title: 'MP3 Converter', anchorText: 'Convert to MP3', description: 'Convert audio to MP3' },
      { slug: 'wav-converter', title: 'WAV Converter', anchorText: 'Convert to WAV', description: 'Convert audio to WAV' },
      { slug: 'mp4-to-mp3', title: 'MP4 to MP3', anchorText: 'Extract Audio from Video', description: 'Extract audio track from MP4' }
    ]
  },

  'pdf-to-word': {
    slug: 'pdf-to-word',
    name: 'PDF to Word',
    category: 'pdf',
    sourceFormat: 'pdf',
    targetFormat: 'docx',
    pageTitle: 'Free PDF to Word Converter — PDF to Editable DOCX | Fylovanta',
    metaDescription: 'Convert PDF documents into editable Microsoft Word (.docx) files free right in your browser with Fylovanta. No account or software required.',
    h1: 'Free PDF to Word Converter',
    intro: 'Extract text and page structure from PDF documents into editable Microsoft Word (.docx) files free inside your browser.',
    keywords: ['free pdf to word', 'convert pdf to docx free', 'pdf to word online', 'editable word from pdf'],
    canonicalUrl: `${DOMAIN_URL}/pdf-to-word`,
    ogTitle: 'Free PDF to Word Converter | Fylovanta',
    ogDescription: 'Convert PDF files to editable DOCX Word documents free online with Fylovanta.',
    howToSteps: [
      'Upload your PDF document into the dropzone.',
      'Confirm DOCX as your target output format.',
      'Click "Convert" to extract text and download your editable Word file.'
    ],
    features: ['Standard OOXML .docx generation', 'Multi-page structure preserved', 'Local browser text extraction'],
    faqData: [
      {
        question: 'Can I edit the converted Word document in Microsoft Word and Google Docs?',
        answer: 'Yes. Fylovanta builds a standard Office Open XML (.docx) document compatible with Microsoft Word, Google Docs, and Apple Pages.'
      },
      {
        question: 'Are my confidential PDFs uploaded to a server?',
        answer: 'No. PDF to Word text extraction and DOCX packaging happen locally inside your web browser.'
      }
    ],
    relatedConverters: [
      { slug: 'word-to-pdf', title: 'Word to PDF', anchorText: 'Convert Word to PDF', description: 'Convert DOCX files into PDF documents' },
      { slug: 'pdf-to-jpg', title: 'PDF to JPG', anchorText: 'Convert PDF to JPG', description: 'Render PDF pages as JPG images' },
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF Documents', description: 'Combine multiple PDFs into one' }
    ]
  },

  'word-to-pdf': {
    slug: 'word-to-pdf',
    name: 'Word to PDF',
    category: 'pdf',
    sourceFormat: 'docx',
    targetFormat: 'pdf',
    pageTitle: 'Free Word to PDF Converter — DOCX & Text to PDF | Fylovanta',
    metaDescription: 'Convert Word (.docx), Markdown, and plain text documents into clean PDF files free right inside your browser with Fylovanta.',
    h1: 'Free Word to PDF Converter',
    intro: 'Turn editable Word (.docx), Markdown, and plain text documents into readable, printable PDF files free inside your browser.',
    keywords: ['free word to pdf', 'docx to pdf free', 'convert word to pdf online', 'text to pdf'],
    canonicalUrl: `${DOMAIN_URL}/word-to-pdf`,
    ogTitle: 'Free Word to PDF Converter | Fylovanta',
    ogDescription: 'Convert DOCX Word documents into clean PDF files free with Fylovanta.',
    howToSteps: [
      'Upload your .docx, .md, or .txt document.',
      'Verify PDF is selected as the target format.',
      'Download your formatted PDF file instantly.'
    ],
    features: ['Parses native .docx paragraphs and headings', 'Supports Markdown and TXT', 'Zero server upload required'],
    faqData: [
      {
        question: 'Which document formats can I convert to PDF?',
        answer: 'Fylovanta converts Microsoft Word (.docx), Markdown (.md), HTML, CSV, JSON, and plain text (.txt) files directly into clean PDF documents.'
      }
    ],
    relatedConverters: [
      { slug: 'pdf-to-word', title: 'PDF to Word', anchorText: 'Convert PDF to Word', description: 'Convert PDF documents back to DOCX' },
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF Files', description: 'Combine multiple PDF documents' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF Size', description: 'Reduce PDF file size' }
    ]
  },

  'svg-to-png': {
    slug: 'svg-to-png',
    name: 'SVG to PNG',
    category: 'image',
    sourceFormat: 'svg',
    targetFormat: 'png',
    pageTitle: 'Free SVG to PNG Converter — Vector to PNG Online | Fylovanta',
    metaDescription: 'Convert SVG vector graphics into crisp transparent PNG images free directly in your browser with Fylovanta. Custom pixel scaling supported.',
    h1: 'Free SVG to PNG Converter',
    intro: 'Rasterize scalable SVG logos, icons, and illustrations into crisp transparent PNG files free in your browser with custom pixel scaling.',
    keywords: ['free svg to png', 'convert svg to png online', 'vector to png free', 'svg rasterizer'],
    canonicalUrl: `${DOMAIN_URL}/svg-to-png`,
    ogTitle: 'Free SVG to PNG Converter | Fylovanta',
    ogDescription: 'Rasterize SVG vector graphics into transparent PNG images free with Fylovanta.',
    howToSteps: [
      'Drop your .svg vector file into the uploader.',
      'Optional: set custom pixel dimensions or scale factor in settings.',
      'Click "Convert" to download your transparent PNG.'
    ],
    features: ['Preserves full alpha transparency', 'Custom pixel scaling', 'Local client-side rendering'],
    faqData: [
      {
        question: 'Can I scale up an SVG before exporting to PNG?',
        answer: 'Yes. Open Advanced Settings and select percentage or custom pixel dimensions to export crisp high-DPI PNG assets.'
      }
    ],
    relatedConverters: [
      { slug: 'png-to-webp', title: 'PNG to WebP', anchorText: 'Convert PNG to WebP', description: 'Shrink transparent PNGs for web' },
      { slug: 'png-to-jpg', title: 'PNG to JPG', anchorText: 'Convert PNG to JPG', description: 'Convert PNG graphics to JPG' },
      { slug: 'image-converter', title: 'Image Converter', anchorText: 'Free Image Converter', description: 'Convert across all image formats' }
    ]
  },

  'csv-to-json': {
    slug: 'csv-to-json',
    name: 'CSV to JSON',
    category: 'utility',
    sourceFormat: 'csv',
    targetFormat: 'json',
    pageTitle: 'Free CSV to JSON Converter — Parse Spreadsheets | Fylovanta',
    metaDescription: 'Convert CSV spreadsheet files into clean, formatted JSON arrays free directly in your browser with Fylovanta. No signup or upload required.',
    h1: 'Free CSV to JSON Converter',
    intro: 'Transform comma-separated CSV tables and exports into structured, pretty-printed JSON arrays free inside your browser.',
    keywords: ['free csv to json', 'convert csv to json online', 'parse csv free', 'spreadsheet to json'],
    canonicalUrl: `${DOMAIN_URL}/csv-to-json`,
    ogTitle: 'Free CSV to JSON Converter | Fylovanta',
    ogDescription: 'Convert CSV spreadsheets into structured JSON arrays free with Fylovanta.',
    howToSteps: [
      'Upload one or more .csv spreadsheet files.',
      'Ensure JSON is selected as target format.',
      'Download your formatted JSON array immediately.'
    ],
    features: ['RFC-4180 quoted field parsing', 'Automatic header-to-key mapping', 'Local browser conversion'],
    faqData: [
      {
        question: 'Does CSV to JSON handle quoted fields with commas?',
        answer: 'Yes. Fylovanta uses a proper stateful CSV parser that preserves quoted strings, escaped quotes, and numeric/boolean inference.'
      }
    ],
    relatedConverters: [
      { slug: 'json-to-csv', title: 'JSON to CSV', anchorText: 'Convert JSON to CSV', description: 'Export JSON arrays to CSV spreadsheets' },
      { slug: 'word-to-pdf', title: 'Word to PDF', anchorText: 'Convert Documents to PDF', description: 'Convert text & DOCX to PDF' }
    ]
  },

  'json-to-csv': {
    slug: 'json-to-csv',
    name: 'JSON to CSV',
    category: 'utility',
    sourceFormat: 'json',
    targetFormat: 'csv',
    pageTitle: 'Free JSON to CSV Converter — Export JSON Tables | Fylovanta',
    metaDescription: 'Convert JSON arrays and objects into Excel-ready CSV spreadsheets free directly in your browser with Fylovanta.',
    h1: 'Free JSON to CSV Converter',
    intro: 'Flatten JSON data arrays and nested records into clean CSV tables free in your browser—ready for Excel, Google Sheets, and reporting.',
    keywords: ['free json to csv', 'convert json to csv online', 'json to excel csv', 'export json table'],
    canonicalUrl: `${DOMAIN_URL}/json-to-csv`,
    ogTitle: 'Free JSON to CSV Converter | Fylovanta',
    ogDescription: 'Convert JSON files into spreadsheet-ready CSV files free with Fylovanta.',
    howToSteps: [
      'Upload your .json file.',
      'Ensure CSV is selected as output format.',
      'Download your spreadsheet-compatible CSV file.'
    ],
    features: ['Automatic column header discovery', 'Nested object flattening', 'Excel & Google Sheets compatible'],
    faqData: [
      {
        question: 'What if my JSON objects have slightly different keys?',
        answer: 'Fylovanta scans all records in your JSON array to build a complete union of column headers so no fields are dropped.'
      }
    ],
    relatedConverters: [
      { slug: 'csv-to-json', title: 'CSV to JSON', anchorText: 'Convert CSV to JSON', description: 'Parse CSV files into JSON arrays' },
      { slug: 'word-to-pdf', title: 'Word to PDF', anchorText: 'Convert Documents to PDF', description: 'Convert text & DOCX to PDF' }
    ]
  },

  'resize-image': {
    slug: 'resize-image',
    name: 'Resize Image',
    category: 'image',
    sourceFormat: 'jpg',
    targetFormat: 'png',
    pageTitle: 'Free Online Image Resizer — Custom Pixels & Scale | Fylovanta',
    metaDescription: 'Resize JPG, PNG, WebP, and GIF images by exact pixel width, height, or percentage free in your browser with Fylovanta.',
    h1: 'Free Online Image Resizer',
    intro: 'Resize images to exact pixel dimensions or scale them proportionally by percentage free inside your browser without installing photo software.',
    keywords: ['free image resizer', 'resize image online free', 'change image dimensions', 'scale photo pixels'],
    canonicalUrl: `${DOMAIN_URL}/resize-image`,
    ogTitle: 'Free Online Image Resizer | Fylovanta',
    ogDescription: 'Resize JPG, PNG, WebP, and GIF images free in your browser with Fylovanta.',
    howToSteps: [
      'Upload one or more JPG, PNG, WebP, or GIF images.',
      'Open Settings to choose custom pixel dimensions or percentage scaling.',
      'Click Convert to download your resized images.'
    ],
    features: ['Exact pixel width and height control', 'Aspect ratio lock option', 'Local in-browser canvas resizing'],
    faqData: [
      {
        question: 'Can I keep the original aspect ratio when resizing?',
        answer: 'Yes. Leave Maintain Aspect Ratio enabled and enter either width or height to scale proportionally without distortion.'
      }
    ],
    relatedConverters: [
      { slug: 'compress-image', title: 'Compress Image', anchorText: 'Compress Image', description: 'Reduce image file size with balanced quality' },
      { slug: 'image-converter', title: 'Image Converter', anchorText: 'Image Converter', description: 'Convert across JPG, PNG, WebP, and more' },
      { slug: 'jpg-to-pdf', title: 'JPG to PDF', anchorText: 'Convert JPG to PDF', description: 'Combine resized images into a PDF' }
    ]
  },

  'rotate-pdf': {
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'utility',
    sourceFormat: 'pdf',
    targetFormat: 'pdf',
    pageTitle: 'Free Rotate PDF Tool — Turn PDF Pages Online | Fylovanta',
    metaDescription: 'Fix sideways or upside-down PDF pages by rotating all pages or specific ranges free locally in your browser with Fylovanta.',
    h1: 'Free Rotate PDF Tool',
    intro: 'Rotate sideways scans or upside-down PDF pages by 90°, 180°, or 270° free inside your browser without uploading documents.',
    keywords: ['free rotate pdf', 'rotate pdf pages online', 'fix upside down pdf', 'turn pdf pages'],
    canonicalUrl: `${DOMAIN_URL}/rotate-pdf`,
    ogTitle: 'Free Rotate PDF Tool | Fylovanta',
    ogDescription: 'Rotate PDF pages free and locally in your browser with Fylovanta.',
    howToSteps: [
      'Upload your PDF document.',
      'Select 90°, 180°, or 270° rotation and an optional page range.',
      'Click Convert to save your properly oriented PDF.'
    ],
    features: ['90°, 180°, and 270° page rotation', 'Supports all pages or specific ranges', 'Processed locally in-browser'],
    faqData: [
      {
        question: 'Can I rotate only specific pages in a PDF?',
        answer: 'Yes. Enter page numbers or ranges such as "1, 3-5" in the Settings panel, or leave it blank to rotate every page.'
      }
    ],
    relatedConverters: [
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF', description: 'Combine multiple PDF documents' },
      { slug: 'split-pdf', title: 'Split PDF', anchorText: 'Split PDF', description: 'Extract pages from a PDF' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF', description: 'Reduce PDF file size' }
    ]
  },

  'add-page-numbers': {
    slug: 'add-page-numbers',
    name: 'Add Page Numbers',
    category: 'utility',
    sourceFormat: 'pdf',
    targetFormat: 'pdf',
    pageTitle: 'Free Add Page Numbers to PDF Tool Online | Fylovanta',
    metaDescription: 'Add sequential page numbers to every page of your PDF document free locally in your browser with Fylovanta.',
    h1: 'Free Add Page Numbers to PDF',
    intro: 'Stamp clean, readable page numbers onto every page of your PDF reports, manuscripts, or handouts free inside your browser.',
    keywords: ['free add page numbers to pdf', 'number pdf pages online', 'pdf pagination tool'],
    canonicalUrl: `${DOMAIN_URL}/add-page-numbers`,
    ogTitle: 'Free Add Page Numbers to PDF | Fylovanta',
    ogDescription: 'Stamp sequential page numbers onto PDF pages free locally with Fylovanta.',
    howToSteps: [
      'Upload the PDF document you want to paginate.',
      'Choose bottom-center, bottom-right, or top-right placement in Settings.',
      'Click Convert to download your numbered PDF.'
    ],
    features: ['Clean sequential numbering (e.g. 1 / 12)', 'Choice of footer or header placement', 'Local in-browser processing'],
    faqData: [
      {
        question: 'Does adding page numbers alter my existing text or layout?',
        answer: 'No. Page numbers are stamped cleanly in the outer margin while preserving your original PDF pages and text.'
      }
    ],
    relatedConverters: [
      { slug: 'watermark-pdf', title: 'Watermark PDF', anchorText: 'Watermark PDF', description: 'Add custom text watermarks to PDFs' },
      { slug: 'merge-pdf', title: 'Merge PDF', anchorText: 'Merge PDF', description: 'Combine multiple PDFs before numbering' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF', description: 'Reduce PDF file size' }
    ]
  },

  'watermark-pdf': {
    slug: 'watermark-pdf',
    name: 'Watermark PDF',
    category: 'utility',
    sourceFormat: 'pdf',
    targetFormat: 'pdf',
    pageTitle: 'Free Watermark PDF Tool — Add Text Stamp Online | Fylovanta',
    metaDescription: 'Add a diagonal translucent text watermark across every page of your PDF document free inside your browser with Fylovanta.',
    h1: 'Free Watermark PDF Tool',
    intro: 'Stamp a clean diagonal text watermark such as DRAFT, CONFIDENTIAL, or a custom label onto every page of your PDF free in your browser.',
    keywords: ['free watermark pdf', 'add watermark to pdf online', 'pdf stamp text', 'draft watermark pdf'],
    canonicalUrl: `${DOMAIN_URL}/watermark-pdf`,
    ogTitle: 'Free Watermark PDF Tool | Fylovanta',
    ogDescription: 'Add custom text watermarks to PDF pages free locally with Fylovanta.',
    howToSteps: [
      'Upload your PDF document.',
      'Enter your custom watermark text and opacity in Settings.',
      'Click Convert to download the watermarked PDF.'
    ],
    features: ['Custom watermark text & opacity', 'Clean diagonal typography across pages', 'Processed locally in-browser'],
    faqData: [
      {
        question: 'Can I customize the watermark text and transparency?',
        answer: 'Yes. Open Settings to specify any watermark text and adjust opacity so underlying content stays readable.'
      }
    ],
    relatedConverters: [
      { slug: 'add-page-numbers', title: 'Add Page Numbers', anchorText: 'Add Page Numbers', description: 'Number pages in your PDF' },
      { slug: 'rotate-pdf', title: 'Rotate PDF', anchorText: 'Rotate PDF Pages', description: 'Fix PDF page orientation' },
      { slug: 'compress-pdf', title: 'Compress PDF', anchorText: 'Compress PDF', description: 'Reduce PDF file size' }
    ]
  }
};

export interface StaticPageSeoConfig {
  slug: string;
  pageTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
}

export const STATIC_PAGE_SEO_CONFIGS: Record<string, StaticPageSeoConfig> = {
  'privacy-policy': {
    slug: 'privacy-policy',
    pageTitle: 'Privacy Policy | Fylovanta',
    metaDescription: 'Read Fylovanta\'s Privacy Policy explaining browser-based file processing, usage counters, contact inquiries, and cookie choices under our India sole-proprietor setup.',
    canonicalUrl: `${DOMAIN_URL}/privacy-policy`,
    ogTitle: 'Privacy Policy | Fylovanta',
    ogDescription: 'Learn how Fylovanta handles files, analytics preferences, and contact inquiries.'
  },
  'terms': {
    slug: 'terms',
    pageTitle: 'Terms of Service | Fylovanta',
    metaDescription: 'Read Fylovanta\'s Terms of Service covering free online file utilities, acceptable use, user file ownership, and India jurisdiction.',
    canonicalUrl: `${DOMAIN_URL}/terms`,
    ogTitle: 'Terms of Service | Fylovanta',
    ogDescription: 'Simple terms for using Fylovanta free online file tools.'
  },
  'cookies': {
    slug: 'cookies',
    pageTitle: 'Cookie Policy & Consent Preferences | Fylovanta',
    metaDescription: 'Understand how Fylovanta uses essential local storage and optional analytics or future AdSense cookies, and manage your consent preferences anytime.',
    canonicalUrl: `${DOMAIN_URL}/cookies`,
    ogTitle: 'Cookie Policy | Fylovanta',
    ogDescription: 'Manage cookie preferences and view storage disclosures on Fylovanta.'
  },
  'security': {
    slug: 'security',
    pageTitle: 'Trust & Security Practices | Fylovanta',
    metaDescription: 'Review how Fylovanta runs core file conversions inside your browser and applies practical request safeguards on optional server endpoints.',
    canonicalUrl: `${DOMAIN_URL}/security`,
    ogTitle: 'Trust & Security Practices | Fylovanta',
    ogDescription: 'Technical overview of Fylovanta\'s browser-first file handling practices.'
  },
  'about': {
    slug: 'about',
    pageTitle: 'About Fylovanta — Free Online File Utility Platform',
    metaDescription: 'Learn about Fylovanta, a free browser-first online file utility site operated independently in India for everyday PDF, image, and document tasks.',
    canonicalUrl: `${DOMAIN_URL}/about`,
    ogTitle: 'About Fylovanta',
    ogDescription: 'Free browser-first online file utilities for everyday PDF, image, and document tasks.'
  },
  'contact': {
    slug: 'contact',
    pageTitle: 'Contact & Support | Fylovanta',
    metaDescription: 'Contact Fylovanta for technical support, bug reports, accessibility feedback, or privacy inquiries.',
    canonicalUrl: `${DOMAIN_URL}/contact`,
    ogTitle: 'Contact Fylovanta',
    ogDescription: 'Get in touch with Fylovanta support.'
  },
  'disclaimer': {
    slug: 'disclaimer',
    pageTitle: 'Disclaimer | Fylovanta',
    metaDescription: 'Read the disclaimer and output verification notice for Fylovanta\'s free online file conversion and editing tools.',
    canonicalUrl: `${DOMAIN_URL}/disclaimer`,
    ogTitle: 'Disclaimer | Fylovanta',
    ogDescription: 'Service disclaimer for Fylovanta free file conversion utilities.'
  },
  'copyright-policy': {
    slug: 'copyright-policy',
    pageTitle: 'Copyright Policy | Fylovanta',
    metaDescription: 'Read Fylovanta\'s Copyright Policy, user content responsibility, and how to report copyright concerns.',
    canonicalUrl: `${DOMAIN_URL}/copyright-policy`,
    ogTitle: 'Copyright Policy | Fylovanta',
    ogDescription: 'Copyright policy for Fylovanta.'
  },
  'accessibility': {
    slug: 'accessibility',
    pageTitle: 'Accessibility Statement | Fylovanta',
    metaDescription: 'Review Fylovanta\'s accessibility practices, keyboard navigation support, and how to share accessibility feedback.',
    canonicalUrl: `${DOMAIN_URL}/accessibility`,
    ogTitle: 'Accessibility Statement | Fylovanta',
    ogDescription: 'Accessibility statement for Fylovanta.'
  },
  'faq': {
    slug: 'faq',
    pageTitle: 'Frequently Asked Questions (FAQ) | Fylovanta',
    metaDescription: 'Answers to common questions about free online tools, supported file formats, browser processing, size limits, and privacy on Fylovanta.',
    canonicalUrl: `${DOMAIN_URL}/faq`,
    ogTitle: 'FAQ | Fylovanta',
    ogDescription: 'Frequently asked questions about Fylovanta free file tools.'
  },
  'pdf-tools': {
    slug: 'pdf-tools',
    pageTitle: 'Free Online PDF Tools — Convert, Merge, Split & Compress | Fylovanta',
    metaDescription: 'Use free browser-based PDF tools on Fylovanta to convert PDF to Word or JPG, merge, split, rotate, add page numbers, watermark, and compress PDF files.',
    canonicalUrl: `${DOMAIN_URL}/pdf-tools`,
    ogTitle: 'Free Online PDF Tools | Fylovanta',
    ogDescription: 'Free PDF conversion, editing, and compression tools in your browser on Fylovanta.'
  },
  'image-tools': {
    slug: 'image-tools',
    pageTitle: 'Free Online Image Tools — Convert, Resize & Compress | Fylovanta',
    metaDescription: 'Convert JPG, PNG, WebP, SVG, ICO, GIF, and AVIF images, resize pixel dimensions, or compress photos free in your browser on Fylovanta.',
    canonicalUrl: `${DOMAIN_URL}/image-tools`,
    ogTitle: 'Free Online Image Tools | Fylovanta',
    ogDescription: 'Free browser-based image conversion, resizing, and compression tools on Fylovanta.'
  },
  'video-tools': {
    slug: 'video-tools',
    pageTitle: 'Video Tools — Feature Status & Alternatives | Fylovanta',
    metaDescription: 'Server-side video conversion and compression tools are currently paused on Fylovanta while browser-based PDF, image, and document tools remain active.',
    canonicalUrl: `${DOMAIN_URL}/video-tools`,
    ogTitle: 'Video Tools | Fylovanta',
    ogDescription: 'Status and browser-first alternatives for video tools on Fylovanta.'
  },
  'audio-tools': {
    slug: 'audio-tools',
    pageTitle: 'Audio Tools — Feature Status & Alternatives | Fylovanta',
    metaDescription: 'Server-side audio extraction and compression tools are currently paused on Fylovanta while browser-based PDF, image, and document tools remain active.',
    canonicalUrl: `${DOMAIN_URL}/audio-tools`,
    ogTitle: 'Audio Tools | Fylovanta',
    ogDescription: 'Status and browser-first alternatives for audio tools on Fylovanta.'
  },
  'document-tools': {
    slug: 'document-tools',
    pageTitle: 'Free Document Tools — Convert Word, PDF, CSV & JSON | Fylovanta',
    metaDescription: 'Convert DOCX Word files, Markdown, HTML, CSV spreadsheets, and JSON data free in your browser on Fylovanta. No signup required.',
    canonicalUrl: `${DOMAIN_URL}/document-tools`,
    ogTitle: 'Free Document Tools | Fylovanta',
    ogDescription: 'Free online document and structured data utilities on Fylovanta.'
  },
  'file-utilities': {
    slug: 'file-utilities',
    pageTitle: 'Free File Utilities — Compression, PDF & Data Tools | Fylovanta',
    metaDescription: 'Compress PDFs and images, rotate or number PDF pages, watermark PDFs, and convert CSV or JSON files free online with Fylovanta.',
    canonicalUrl: `${DOMAIN_URL}/file-utilities`,
    ogTitle: 'Free File Utilities | Fylovanta',
    ogDescription: 'Free online compression, PDF editing, and data formatting utilities on Fylovanta.'
  }
};

/**
 * Returns SEO configuration for a given slug or fallback
 */
export function getSeoConfig(slug: string): ConverterSeoConfig | null {
  const cleanSlug = slug.replace(/^\//, '').trim();
  return CONVERTER_SEO_CONFIGS[cleanSlug] || null;
}

export function getStaticPageSeoConfig(slug: string): StaticPageSeoConfig | null {
  const cleanSlug = slug.replace(/^\//, '').trim();
  return STATIC_PAGE_SEO_CONFIGS[cleanSlug] || null;
}

/**
 * Generates JSON-LD Structured Data for a given converter page
 */
export function generateStructuredData(config: ConverterSeoConfig) {
  const disabled = isToolDisabled(config.slug, config.category);
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': `${config.h1} — Fylovanta`,
    'url': config.canonicalUrl,
    'description': config.metaDescription,
    'applicationCategory': 'UtilitiesApplication',
    'operatingSystem': 'Any',
    ...(disabled
      ? {}
      : {
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        }),
    'browserRequirements': 'Requires HTML5 support with JavaScript enabled',
  };

  const CATEGORY_BREADCRUMB_MAP: Record<ConverterSeoConfig['category'], { name: string; slug: string }> = {
    image: { name: 'Image Tools', slug: 'image-tools' },
    pdf: { name: 'PDF Tools', slug: 'pdf-tools' },
    utility: { name: 'PDF Tools', slug: 'pdf-tools' },
    video: { name: 'Video Tools', slug: 'video-tools' },
    audio: { name: 'Audio Tools', slug: 'audio-tools' },
    compress: { name: 'File Utilities', slug: 'file-utilities' },
  };
  let baseOrigin = DOMAIN_URL;
  try {
    baseOrigin = new URL(config.canonicalUrl).origin;
  } catch {
    baseOrigin = DOMAIN_URL;
  }
  const catBreadcrumb = CATEGORY_BREADCRUMB_MAP[config.category] || {
    name: 'File Utilities',
    slug: 'file-utilities',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': `${baseOrigin}/`,
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': catBreadcrumb.name,
        'item': `${baseOrigin}/${catBreadcrumb.slug}`,
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': config.h1,
        'item': config.canonicalUrl,
      },
    ],
  };

  const faqSchema = config.faqData.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': config.faqData.map((faq) => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  } : null;

  return [websiteSchema, breadcrumbSchema, ...(faqSchema ? [faqSchema] : [])];
}
