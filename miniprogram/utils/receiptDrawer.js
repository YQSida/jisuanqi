/**
 * 电子回收小票 Canvas 2D 绘制工具
 */

// 金额转中文大写
function digitUppercase(n) {
    if (isNaN(n) || n === null || n === undefined) return '零元整';
    const fraction = ['角', '分'];
    const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unit = [
        ['元', '万', '亿'],
        ['', '拾', '佰', '仟']
    ];
    let num = Math.abs(n);
    let s = '';
    for (let i = 0; i < fraction.length; i++) {
        s += (digit[Math.floor(num * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
    }
    s = s || '整';
    num = Math.floor(num);
    for (let i = 0; i < unit[0].length && num > 0; i++) {
        let p = '';
        for (let j = 0; j < unit[1].length && num > 0; j++) {
            p = digit[num % 10] + unit[1][j] + p;
            num = Math.floor(num / 10);
        }
        s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
    }
    return s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
}

// 模拟绘制逼真的二维码点阵与三个定位角
function drawQRCode(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = '#2C3E50';
    
    // 三个角的位置探测图案 (Position Detection Pattern)
    const drawFinderPattern = (px, py) => {
        // 外框 7x7 比例
        const unit = size / 21;
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(px, py, unit * 7, unit * 7);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px + unit, py + unit, unit * 5, unit * 5);
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(px + unit * 2, py + unit * 2, unit * 3, unit * 3);
    };

    const unit = size / 21;
    // 左上
    drawFinderPattern(x, y);
    // 右上
    drawFinderPattern(x + unit * 14, y);
    // 左下
    drawFinderPattern(x, y + unit * 14);

    // 绘制模拟数据点阵 (固定伪随机伪装真实QR)
    ctx.fillStyle = '#2C3E50';
    const matrixPattern = [
        [0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,0],
        [0,1,1,0,1,0,0,0,0,1,1,0,0,1,0,1,0,0,1,1,1],
        [1,0,1,1,0,1,1,1,1,0,0,1,1,0,1,0,1,1,0,0,1],
        [1,1,0,0,1,0,1,0,0,1,1,0,1,1,0,1,0,0,1,0,1],
        [0,0,1,1,0,1,0,1,1,0,1,1,0,0,1,0,1,1,0,1,0],
        [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,1,1,0,1,0,1,1,0,1,0,0,1],
        [0,0,0,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,1,1,0],
        [0,0,0,0,0,0,0,0,0,1,1,0,1,0,1,1,0,0,1,0,1],
        [0,0,0,0,0,0,0,0,1,0,1,1,0,1,0,1,1,1,0,1,0],
        [0,0,0,0,0,0,0,0,0,1,0,0,1,0,1,0,0,1,1,0,1],
        [0,0,0,0,0,0,0,0,1,1,1,1,0,1,0,1,1,0,0,1,0],
        [0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,1,1,0,1]
    ];

    for (let r = 0; r < 21; r++) {
        for (let c = 0; c < 21; c++) {
            // 跳过3个Finder角
            if ((r < 7 && c < 7) || (r < 7 && c >= 14) || (r >= 14 && c < 7)) continue;
            if (matrixPattern[r] && matrixPattern[r][c] === 1) {
                ctx.fillRect(x + c * unit, y + r * unit, unit * 0.92, unit * 0.92);
            }
        }
    }

    // 中间放一个可爱的小绿芯徽章
    const centerSize = unit * 4.5;
    const centerX = x + (size - centerSize) / 2;
    const centerY = y + (size - centerSize) / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(centerX - 1, centerY - 1, centerSize + 2, centerSize + 2);
    ctx.fillStyle = '#0F5A3E';
    ctx.fillRect(centerX, centerY, centerSize, centerSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(unit * 2.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('废', centerX + centerSize / 2, centerY + centerSize / 2);

    ctx.restore();
}

// 绘制“已结清”鲜红印章
function drawSeal(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-12 * Math.PI / 180); // 倾斜-12度，更有真实感

    const w = 96;
    const h = 46;
    const r = 6;

    // 印泥红色
    ctx.strokeStyle = '#D32F2F';
    ctx.fillStyle = '#D32F2F';
    ctx.lineWidth = 2.5;

    // 外圆角边框
    ctx.beginPath();
    ctx.moveTo(-w/2 + r, -h/2);
    ctx.lineTo(w/2 - r, -h/2);
    ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
    ctx.lineTo(w/2, h/2 - r);
    ctx.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
    ctx.lineTo(-w/2 + r, h/2);
    ctx.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
    ctx.lineTo(-w/2, -h/2 + r);
    ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
    ctx.closePath();
    ctx.stroke();

    // 内虚线细边框
    ctx.lineWidth = 1;
    ctx.beginPath();
    const iw = w - 6;
    const ih = h - 6;
    const ir = 4;
    ctx.moveTo(-iw/2 + ir, -ih/2);
    ctx.lineTo(iw/2 - ir, -ih/2);
    ctx.quadraticCurveTo(iw/2, -ih/2, iw/2, -ih/2 + ir);
    ctx.lineTo(iw/2, ih/2 - ir);
    ctx.quadraticCurveTo(iw/2, ih/2, iw/2 - ir, ih/2);
    ctx.lineTo(-iw/2 + ir, ih/2);
    ctx.quadraticCurveTo(-iw/2, ih/2, -iw/2, ih/2 - ir);
    ctx.lineTo(-iw/2, -ih/2 + ir);
    ctx.quadraticCurveTo(-iw/2, -ih/2, -iw/2 + ir, -ih/2);
    ctx.stroke();

    // 上方微型文字
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('★ 绿色回收 · 现金结清 ★', 0, -h/2 + 5);

    // 中间大字
    ctx.font = 'bold 18px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('已结算', 0, 8);

    ctx.restore();
}

/**
 * 绘制虚线
 */
function drawDashedLine(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = '#BDC3C7';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

/**
 * 计算小票所需的高度
 */
function calculateReceiptHeight(bill) {
    const baseHeight = 390; // 头尾基础固定高度
    const itemsCount = (bill.items && bill.items.length) || 1;
    const itemHeight = 34; // 每一条明细的高度
    const discountHeight = (bill.discount && bill.discount > 0) ? 28 : 0;
    return baseHeight + (itemsCount * itemHeight) + discountHeight;
}

/**
 * 核心渲染函数
 * @param {Canvas} canvas - Canvas 2D 实例
 * @param {Object} options - 配置与账单数据
 */
function renderReceipt(canvas, options) {
    const {
        bill,
        storeName = '绿色废品回收站',
        storePhone = '',
        width = 375,
        height = 500
    } = options;

    const ctx = canvas.getContext('2d');
    const dpr = wx.getSystemInfoSync().pixelRatio || 2;

    // 重设画布物理像素尺寸
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. 背景层：高雅仿小票浅米白纸张
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 顶部复古绿色条带
    ctx.fillStyle = '#0F5A3E';
    ctx.fillRect(0, 0, width, 8);

    const paddingX = 22;
    let currY = 32;

    // 2. 标题区
    ctx.fillStyle = '#0F5A3E';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(storeName || '绿色废品回收站', width / 2, currY);
    currY += 26;

    ctx.fillStyle = '#7F8C8D';
    ctx.font = '12px sans-serif';
    ctx.fillText('— 电子回收结算凭证 —', width / 2, currY);
    currY += 24;

    // 3. 基本信息
    const billId = bill.id ? String(bill.id).slice(-8) : Date.now().toString().slice(-8);
    const date = bill.time ? new Date(bill.time) : new Date();
    const formatTime = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#34495E';
    ctx.font = '12px sans-serif';
    ctx.fillText(`单号：NO.${date.getFullYear()}${formatTime.slice(5,7)}${formatTime.slice(8,10)}-${billId}`, paddingX, currY);
    currY += 18;

    ctx.fillText(`时间：${formatTime}`, paddingX, currY);
    currY += 18;

    if (storePhone) {
        ctx.fillText(`电话：${storePhone}`, paddingX, currY);
        currY += 18;
    }

    currY += 4;
    // 虚线分割
    drawDashedLine(ctx, paddingX, currY, width - paddingX, currY);
    currY += 14;

    // 4. 表头 (品类 | 单价 | 重量 | 小计)
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('品类', paddingX, currY);
    ctx.fillText('单价', 135, currY);
    ctx.fillText('重量', 215, currY);
    ctx.textAlign = 'right';
    ctx.fillText('小计(元)', width - paddingX, currY);
    currY += 18;

    drawDashedLine(ctx, paddingX, currY, width - paddingX, currY);
    currY += 12;

    // 5. 明细列表
    ctx.font = '13px sans-serif';
    let totalWeight = 0;
    const items = bill.items || [];

    items.forEach(item => {
        const catName = item.catName || '废品';
        const unitPrice = parseFloat(item.unitPrice || 0).toFixed(2);
        const weight = parseFloat(item.weight || 0);
        const unit = item.unit || '斤';
        const total = parseFloat(item.total || 0).toFixed(2);
        totalWeight += weight;

        ctx.fillStyle = '#2C3E50';
        ctx.textAlign = 'left';
        // 品类名截断保底
        const displayName = catName.length > 5 ? catName.slice(0, 5) + '..' : catName;
        ctx.fillText(displayName, paddingX, currY);
        
        ctx.fillStyle = '#7F8C8D';
        ctx.fillText(`${unitPrice}/${unit}`, 135, currY);

        ctx.fillStyle = '#2C3E50';
        let weightStr = `${weight}${unit}`;
        if (item.tareWeight && item.tareWeight > 0) {
            weightStr = `${weight}${unit}(皮${item.tareWeight})`;
        }
        ctx.fillText(weightStr, 215, currY);

        ctx.textAlign = 'right';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(total, width - paddingX, currY);
        ctx.font = '13px sans-serif';

        currY += 28;
    });

    currY -= 6;
    drawDashedLine(ctx, paddingX, currY, width - paddingX, currY);
    currY += 16;

    // 6. 统计区域
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '12px sans-serif';
    ctx.fillText(`品类件数：${items.length} 种`, paddingX, currY);
    ctx.fillText(`合计净重：${totalWeight.toFixed(1)} ${items[0] ? items[0].unit : '斤'}`, 140, currY);
    currY += 22;

    // 若有抹零优惠折让
    const hasDiscount = bill.discount && bill.discount > 0;
    if (hasDiscount) {
        const origMoney = parseFloat(bill.originalTotal || (bill.total + bill.discount)).toFixed(2);
        const discMoney = parseFloat(bill.discount).toFixed(2);
        ctx.fillStyle = '#7F8C8D';
        ctx.font = '12px sans-serif';
        ctx.fillText(`应计原价：￥${origMoney}`, paddingX, currY);
        ctx.fillStyle = '#E74C3C';
        ctx.fillText(`抹零让利：-￥${discMoney}`, 160, currY);
        currY += 22;
    }

    const totalMoney = parseFloat(bill.total || 0).toFixed(2);
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('实结总额：', paddingX, currY);

    ctx.fillStyle = '#0F5A3E';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`￥${totalMoney}`, paddingX + 75, currY - 2);

    // 盖上“已结清”鲜红印章
    drawSeal(ctx, width - paddingX - 48, currY - 2);

    currY += 24;
    ctx.fillStyle = '#95A5A6';
    ctx.font = '11px sans-serif';
    ctx.fillText(`大写：${digitUppercase(parseFloat(bill.total || 0))}`, paddingX, currY);
    currY += 20;

    // 虚线分割
    drawDashedLine(ctx, paddingX, currY, width - paddingX, currY);
    currY += 16;

    // 7. 环保宣传与小程序信息
    ctx.textAlign = 'center';
    ctx.fillStyle = '#27AE60';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('🌱 资源循环利用 · 绿水青山就是金山银山 🌱', width / 2, currY);
    currY += 20;

    // 绘制二维码
    const qrSize = 72;
    const qrX = (width - qrSize) / 2;
    drawQRCode(ctx, qrX, currY, qrSize);
    currY += qrSize + 12;

    ctx.fillStyle = '#7F8C8D';
    ctx.font = '11px sans-serif';
    ctx.fillText('微信扫码或搜索「摊友称重计价助手」快捷记账', width / 2, currY);
    currY += 16;

    ctx.fillStyle = '#BDC3C7';
    ctx.font = '10px sans-serif';
    ctx.fillText('凭证电子存档 · 长按图片可保存或分享', width / 2, currY);
    currY += 18;

    // 8. 底部锯齿花边效果 (仿打票撕纸)
    ctx.fillStyle = '#F5F7FA'; // 与页面背景融合的锯齿
    const toothCount = 25;
    const toothWidth = width / toothCount;
    const toothHeight = 6;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i < toothCount; i++) {
        const x = i * toothWidth;
        ctx.lineTo(x + toothWidth / 2, height - toothHeight);
        ctx.lineTo(x + toothWidth, height);
    }
    ctx.closePath();
    ctx.fill();
}

module.exports = {
    renderReceipt,
    calculateReceiptHeight,
    digitUppercase
};
