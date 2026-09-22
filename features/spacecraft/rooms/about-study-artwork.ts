/** Original, static artwork for the personal study. No images or font downloads. */
export function drawStudyArtwork(
  ctx: any,
  kind: string,
  options: { notebookName?: string } = {},
) {
  const landscape = kind === 'landscape-postcard';
  const width = landscape ? 512 : 768;
  const height = landscape ? 320 : 1024;
  ctx.save();
  ctx.scale(ctx.canvas.width / width, ctx.canvas.height / height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ink = '#203147';
  const paleInk = '#62717b';
  let seed = 7429;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const path = (points: number[][], color = ink, thickness = 2) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
  };
  const polygon = (points: number[][], color: string) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  const lettering = (
    text: string,
    x: number,
    y: number,
    size = 28,
    style = '',
    color = ink,
    maxWidth?: number,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${style} ${size}px "Helvetica Neue", Arial, sans-serif`;
    if (maxWidth === undefined) ctx.fillText(text, x, y);
    else ctx.fillText(text, x, y, maxWidth);
  };
  const paper = () => {
    ctx.fillStyle = '#ece0c7';
    ctx.fillRect(0, 0, width, height);
    const tone = ctx.createLinearGradient(0, 0, width, height);
    tone.addColorStop(0, 'rgba(255,250,235,0.21)');
    tone.addColorStop(0.7, 'rgba(247,232,197,0)');
    tone.addColorStop(1, 'rgba(158,129,85,0.065)');
    ctx.fillStyle = tone;
    ctx.fillRect(0, 0, width, height);
    // Restrained, seeded fibers remain identical whenever the texture is rebuilt.
    for (let i = 0; i < 1100; i++) {
      const x = random() * width;
      const y = random() * height;
      ctx.strokeStyle = `rgba(92,75,51,${0.018 + random() * 0.025})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2 + random() * 5, y + random() * 3 - 1.5);
      ctx.stroke();
    }
  };
  const tree = (x: number, y: number, size: number) => {
    path(
      [
        [x, y],
        [x, y - size],
      ],
      ink,
      1.5,
    );
    for (let i = 1; i <= 5; i++) {
      const branchY = y - size + (i * size) / 6.2;
      const spread = (i * size) / 14;
      path(
        [
          [x - spread, branchY + size * 0.12],
          [x, branchY],
          [x + spread, branchY + size * 0.12],
        ],
        ink,
        1.4,
      );
    }
  };
  const mountain = (x: number, y: number, scale: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const silhouette = [
      [0, 233],
      [50, 205],
      [92, 179],
      [130, 132],
      [148, 144],
      [209, 56],
      [229, 80],
      [265, 18],
      [287, 45],
      [324, 123],
      [353, 111],
      [409, 192],
      [461, 216],
      [490, 247],
    ];
    path(silhouette, ink, 2.9);
    path(
      [
        [92, 179],
        [129, 163],
        [132, 135],
        [156, 164],
        [196, 132],
        [209, 58],
        [220, 116],
        [238, 89],
        [265, 20],
        [267, 91],
        [289, 128],
        [280, 103],
        [285, 48],
      ],
      ink,
      1.7,
    );
    path(
      [
        [265, 25],
        [248, 104],
        [234, 138],
        [210, 153],
        [180, 190],
        [151, 208],
      ],
      ink,
      2,
    );
    path(
      [
        [272, 96],
        [287, 162],
        [320, 210],
        [348, 228],
      ],
      ink,
      1.6,
    );
    path(
      [
        [353, 114],
        [338, 157],
        [346, 192],
        [392, 232],
      ],
      ink,
      1.7,
    );
    path(
      [
        [26, 244],
        [110, 226],
        [192, 228],
        [227, 215],
        [279, 223],
        [300, 245],
        [417, 251],
        [478, 268],
      ],
      paleInk,
      1.2,
    );
    const hatch = [
      [247, 84, 219, 139],
      [243, 107, 227, 134],
      [229, 142, 196, 174],
      [218, 153, 185, 189],
      [211, 169, 177, 199],
      [259, 94, 248, 137],
      [250, 143, 221, 183],
      [244, 165, 223, 195],
      [275, 137, 296, 181],
      [280, 160, 308, 208],
      [290, 184, 308, 216],
      [317, 141, 335, 179],
      [311, 158, 326, 188],
      [341, 182, 372, 213],
      [141, 164, 110, 202],
      [160, 169, 134, 199],
      [184, 141, 174, 167],
      [378, 179, 400, 218],
    ];
    hatch.forEach(([a, b, c, d]) =>
      path(
        [
          [a, b],
          [c, d],
        ],
        ink,
        1.25,
      ),
    );
    tree(28, 273, 54);
    tree(47, 281, 37);
    tree(410, 264, 92);
    tree(447, 281, 56);
    tree(387, 272, 46);
    tree(81, 278, 27);
    path(
      [
        [10, 286],
        [87, 294],
        [165, 286],
        [215, 270],
        [260, 271],
        [310, 290],
        [385, 291],
        [472, 283],
      ],
      ink,
      1.25,
    );
    path(
      [
        [174, 292],
        [201, 279],
        [224, 278],
        [236, 289],
        [217, 298],
      ],
      paleInk,
      1.1,
    );
    for (const [a, b] of [
      [102, 259],
      [118, 266],
      [334, 267],
      [360, 278],
      [60, 286],
      [468, 274],
      [183, 259],
    ]) {
      path(
        [
          [a, b],
          [a + 7, b - 3],
          [a + 11, b + 1],
        ],
        ink,
        1.2,
      );
    }
    ctx.restore();
  };
  const arrow = (
    cx: number,
    cy: number,
    radius: number,
    from: number,
    to: number,
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.6;
    ctx.arc(cx, cy, radius, from, to);
    ctx.stroke();
    const x = cx + Math.cos(to) * radius;
    const y = cy + Math.sin(to) * radius;
    const direction = to + Math.PI / 2;
    path(
      [
        [
          x - 13 * Math.cos(direction - 0.45),
          y - 13 * Math.sin(direction - 0.45),
        ],
        [x, y],
        [
          x - 13 * Math.cos(direction + 0.45),
          y - 13 * Math.sin(direction + 0.45),
        ],
      ],
      ink,
      2.6,
    );
  };

  if (kind === 'landscape-postcard') {
    const sky = ctx.createLinearGradient(0, 0, 0, 240);
    sky.addColorStop(0, '#547a99');
    sky.addColorStop(1, '#b1c7cd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 320);
    polygon(
      [
        [15, 63],
        [36, 41],
        [55, 56],
        [68, 60],
        [80, 70],
        [15, 70],
      ],
      '#e2ded0',
    );
    polygon(
      [
        [332, 56],
        [354, 44],
        [376, 56],
        [405, 61],
        [420, 68],
        [326, 68],
      ],
      '#d4d4c8',
    );
    polygon(
      [
        [0, 199],
        [78, 130],
        [106, 149],
        [165, 75],
        [218, 152],
        [281, 89],
        [364, 161],
        [419, 111],
        [512, 181],
        [512, 257],
        [0, 257],
      ],
      '#5d7888',
    );
    polygon(
      [
        [79, 189],
        [163, 76],
        [196, 126],
        [221, 153],
        [277, 106],
        [326, 165],
        [355, 185],
      ],
      '#bac7c7',
    );
    polygon(
      [
        [130, 145],
        [164, 76],
        [170, 111],
        [183, 133],
        [166, 121],
        [151, 133],
      ],
      '#ede7d6',
    );
    polygon(
      [
        [220, 182],
        [281, 89],
        [300, 131],
        [319, 156],
        [275, 129],
        [258, 153],
      ],
      '#e5e0d4',
    );
    polygon(
      [
        [281, 89],
        [291, 128],
        [276, 122],
        [300, 156],
        [326, 166],
        [311, 129],
      ],
      '#8298a4',
    );
    polygon(
      [
        [0, 238],
        [30, 217],
        [81, 223],
        [119, 189],
        [160, 207],
        [203, 218],
        [231, 206],
        [271, 236],
        [330, 221],
        [388, 233],
        [448, 196],
        [512, 222],
        [512, 320],
        [0, 320],
      ],
      '#3b5967',
    );
    ctx.fillStyle = '#8fa8ae';
    ctx.fillRect(0, 252, 512, 68);
    polygon(
      [
        [0, 263],
        [77, 243],
        [151, 252],
        [119, 261],
        [60, 267],
        [19, 295],
        [0, 314],
      ],
      '#293f43',
    );
    polygon(
      [
        [512, 248],
        [441, 230],
        [374, 251],
        [409, 260],
        [464, 271],
        [512, 315],
      ],
      '#334b4d',
    );
    for (let i = 0; i < 30; i++) {
      const x = 75 + random() * 350,
        y = 258 + random() * 62;
      path(
        [
          [x, y],
          [x + 8 + random() * 39, y],
        ],
        i % 2 ? '#bec9c4' : '#6d8d98',
        1,
      );
    }
    for (const [x, y, s] of [
      [31, 265, 48],
      [47, 261, 61],
      [67, 256, 43],
      [454, 258, 41],
      [477, 265, 59],
      [493, 269, 48],
    ]) {
      ctx.fillStyle = '#283b3b';
      polygon(
        [
          [x, y - s],
          [x - s * 0.2, y - s * 0.35],
          [x - s * 0.1, y - s * 0.35],
          [x - s * 0.31, y],
          [x + s * 0.31, y],
          [x + s * 0.1, y - s * 0.35],
          [x + s * 0.2, y - s * 0.35],
        ],
        '#283b3b',
      );
    }
  } else if (kind.startsWith('book-')) {
    const variants: Record<
      string,
      { color: string; title: string[]; subtitle: string }
    > = {
      'book-one': {
        color: '#24384a',
        title: ['Small', 'systems'],
        subtitle: 'A WORKING NOTEBOOK',
      },
      'book-two': {
        color: '#79766d',
        title: ['Design', 'notes'],
        subtitle: 'OBSERVATIONS & IDEAS',
      },
      'book-three': {
        color: '#c5b69a',
        title: ['Field', 'journal'],
        subtitle: 'NOTES FROM THE EVERYDAY',
      },
    };
    const book = variants[kind] ?? variants['book-one'];
    ctx.fillStyle = book.color;
    ctx.fillRect(0, 0, width, height);
    const coverInk = kind === 'book-three' ? '#24384a' : '#e4dbc6';
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,246,218,0.055)' : 'rgba(10,20,28,0.06)';
      ctx.fillRect(random() * width, random() * height, 0.9, 2 + random() * 4);
    }
    path(
      [
        [48, 36],
        [48, 988],
      ],
      coverInk,
      0.8,
    );
    path(
      [
        [62, 36],
        [62, 988],
      ],
      coverInk,
      0.5,
    );
    path(
      [
        [122, 162],
        [637, 162],
      ],
      coverInk,
      1.5,
    );
    book.title.forEach((word, i) =>
      lettering(word, 120, 284 + i * 95, 70, '500', coverInk),
    );
    ctx.fillStyle = coverInk;
    ctx.font = '17px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(book.subtitle, 122, 862);
    path(
      [
        [122, 891],
        [270, 891],
      ],
      coverInk,
      1.5,
    );
  } else {
    paper();
    if (kind === 'journal-left') {
      lettering('PERSONAL LOG', 72, 116, 26, '600');
      path(
        [
          [72, 138],
          [644, 138],
        ],
        paleInk,
        1,
      );
      lettering(
        options.notebookName?.trim() || 'Personal log',
        72,
        212,
        48,
        '500',
        ink,
        572,
      );
      lettering('Useful products.', 72, 278, 30);
      lettering('Thoughtful engineering.', 72, 320, 30);
      path(
        [
          [72, 383],
          [230, 383],
        ],
        paleInk,
        1,
      );
      mountain(86, 466, 1.19);
      lettering('Always curious.', 74, 934, 23, 'italic', paleInk);
    } else if (kind === 'journal-right') {
      lettering('How I work', 70, 120, 45, '600');
      path(
        [
          [72, 146],
          [642, 146],
        ],
        paleInk,
        1,
      );
      const sentences = [
        'Understand the constraint.',
        'Build something useful.',
        'Measure, then improve.',
      ];
      sentences.forEach((sentence, i) => {
        const y = 225 + i * 89;
        lettering(`0${i + 1}`, 72, y, 25, '500', paleInk);
        lettering(sentence, 127, y, 27, '400');
      });
      ctx.fillStyle = ink;
      ctx.font = 'italic 34px Georgia, serif';
      ctx.fillText('Observe', 297, 575);
      ctx.fillText('Build', 474, 793);
      ctx.fillText('Improve', 160, 793);
      arrow(375, 705, 140, -1.1, 0.3);
      arrow(375, 705, 140, 0.89, 2.22);
      arrow(375, 705, 140, 2.87, 4.18);
      lettering('A little better each cycle.', 203, 953, 22, 'italic', paleInk);
    } else if (kind === 'mountain-note') {
      mountain(55, 258, 1.35);
      path(
        [
          [104, 745],
          [361, 745],
        ],
        paleInk,
        1,
      );
      ctx.fillStyle = ink;
      ctx.font = 'italic 30px Georgia, serif';
      ctx.fillText('Look a little closer.', 101, 811);
    } else if (kind === 'curiosity-note') {
      ctx.save();
      ctx.translate(95, 260);
      ctx.rotate(0.018);
      ctx.fillStyle = ink;
      ctx.font = 'italic 85px Georgia, serif';
      ctx.fillText('Stay', 36, 164);
      ctx.fillText('curious.', 36, 286);
      path(
        [
          [49, 331],
          [320, 337],
          [419, 328],
        ],
        ink,
        3.5,
      );
      ctx.restore();
    } else if (kind === 'personal-note') {
      ctx.save();
      ctx.translate(95, 260);
      ctx.rotate(-0.025);
      ctx.fillStyle = ink;
      ctx.font = 'italic 85px Georgia, serif';
      ctx.fillText('Make', 36, 102);
      ctx.fillText('useful', 36, 224);
      ctx.fillText('things.', 36, 346);
      path(
        [
          [49, 391],
          [306, 397],
          [360, 390],
        ],
        ink,
        3.5,
      );
      ctx.restore();
    }
  }
  ctx.restore();
}
