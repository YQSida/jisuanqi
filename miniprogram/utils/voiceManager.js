/**
 * voiceManager.js - 纯离线零延迟语音播报管理器
 * 1. 按键音 100% 本地音频（/audio/key_*.mp3），0 网络开销，0 延迟
 * 2. 连续金额读报（/audio/word_*.mp3），智能转换为中文数字拼读队列
 * 3. 伴随物理轻震动 (wx.vibrateShort light)，提供双重操作反馈
 */

// 基础音频映射表
const AUDIO_MAP = {
    // 数字按键
    '0': '/audio/key_0.mp3',
    '1': '/audio/key_1.mp3',
    '2': '/audio/key_2.mp3',
    '3': '/audio/key_3.mp3',
    '4': '/audio/key_4.mp3',
    '5': '/audio/key_5.mp3',
    '6': '/audio/key_6.mp3',
    '7': '/audio/key_7.mp3',
    '8': '/audio/key_8.mp3',
    '9': '/audio/key_9.mp3',
    '00': '/audio/key_00.mp3',
    '零零': '/audio/key_00.mp3',

    // 运算符与操作
    '.': '/audio/key_dot.mp3',
    '点': '/audio/key_dot.mp3',
    '+': '/audio/key_plus.mp3',
    '加': '/audio/key_plus.mp3',
    '-': '/audio/key_minus.mp3',
    '减': '/audio/key_minus.mp3',
    'back': '/audio/key_back.mp3',
    '退格': '/audio/key_back.mp3',
    'C': '/audio/key_clear.mp3',
    '清空': '/audio/key_clear.mp3',
    'add': '/audio/key_add.mp3',
    '已加入清单': '/audio/key_add.mp3',

    // 结算词缀
    'word_total': '/audio/word_total.mp3', // 总共收废品
    'word_yuan': '/audio/word_yuan.mp3',   // 元
    'word_shi': '/audio/word_shi.mp3',     // 十
    'word_bai': '/audio/word_bai.mp3',     // 百
    'word_qian': '/audio/word_qian.mp3',   // 千
    'word_wan': '/audio/word_wan.mp3',     // 万
    'word_jiao': '/audio/word_jiao.mp3',   // 角
    'word_fen': '/audio/word_fen.mp3',     // 分
    'word_zheng': '/audio/word_zheng.mp3', // 整
    'word_liang': '/audio/word_liang.mp3'  // 两
};

let audioCtx = null;
let currentQueue = [];
let isQueuePlaying = false;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = wx.createInnerAudioContext();
        audioCtx.obeyMuteSwitch = false;
    }
    return audioCtx;
}

/**
 * 停止当前正在播放的声音或队列
 */
function stop() {
    currentQueue = [];
    isQueuePlaying = false;
    if (audioCtx) {
        try {
            audioCtx.stop();
        } catch (e) {}
    }
}

/**
 * 播放单个按键声音（单发即断，保证按键快速连点时绝不粘连）
 * @param {string} key 按键字符或动作名称
 * @param {boolean} vibrate 是否同时触发微震动反馈
 */
function playKey(key, vibrate = true) {
    if (vibrate) {
        wx.vibrateShort({ type: 'light' });
    }

    const src = AUDIO_MAP[key];
    if (!src) return;

    // 停止队列
    currentQueue = [];
    isQueuePlaying = false;

    const ctx = getAudioContext();
    // 移除队列的监听，避免干扰
    ctx.onEnded(() => {});
    ctx.onError(() => {});

    ctx.stop();
    ctx.src = src;
    ctx.play();
}

/**
 * 将数字金额解析为音频 ID 队列（例：125.50 -> ['word_total', 'key_1', 'word_bai', 'key_2', 'word_shi', 'key_5', 'word_yuan', 'key_5', 'word_jiao']）
 */
function convertAmountToAudioList(num) {
    num = Math.round(num * 100) / 100;
    const list = ['word_total'];
    if (num <= 0) {
        list.push('key_0', 'word_yuan', 'word_zheng');
        return list;
    }

    const intPart = Math.floor(num);
    const decimalPart = Math.round((num - intPart) * 100);
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;

    function convertChunk(n) {
        const units = ['', 'word_shi', 'word_bai', 'word_qian'];
        const digits = ['key_0', 'key_1', 'key_2', 'key_3', 'key_4', 'key_5', 'key_6', 'key_7', 'key_8', 'key_9'];
        if (n === 0) return [];
        if (n >= 10 && n < 20) {
            const res = ['word_shi'];
            if (n % 10 > 0) res.push(digits[n % 10]);
            return res;
        }
        const res = [];
        const s = n.toString();
        const len = s.length;
        let zero = false;
        for (let i = 0; i < len; i++) {
            const d = parseInt(s[i]);
            const unitIdx = len - 1 - i;
            if (d === 0) {
                zero = true;
            } else {
                if (zero && res.length > 0) {
                    res.push('key_0');
                    zero = false;
                }
                res.push(digits[d]);
                if (unitIdx > 0) res.push(units[unitIdx]);
            }
        }
        return res;
    }

    function convertIntFull(n) {
        if (n === 0) return ['key_0'];
        if (n < 10000) return convertChunk(n);
        const wan = Math.floor(n / 10000);
        const rest = n % 10000;
        const res = [...convertChunk(wan), 'word_wan'];
        if (rest > 0) {
            if (rest < 1000) res.push('key_0');
            res.push(...convertChunk(rest));
        }
        return res;
    }

    if (intPart > 0) {
        list.push(...convertIntFull(intPart));
        list.push('word_yuan');
    }

    if (jiao > 0) {
        list.push(jiao.toString(), 'word_jiao');
    }
    if (fen > 0) {
        if (intPart > 0 && jiao === 0) {
            list.push('0');
        }
        list.push(fen.toString(), 'word_fen');
    }

    if (jiao === 0 && fen === 0 && intPart > 0) {
        list.push('word_zheng');
    }

    return list;
}

/**
 * 播放一段音频队列（连续读报金额）
 * @param {Array<string>} list 音频名称数组
 */
function playQueue(list) {
    if (!list || list.length === 0) return;
    currentQueue = [...list];
    isQueuePlaying = true;

    const ctx = getAudioContext();
    ctx.stop();

    function playNext() {
        if (!isQueuePlaying || currentQueue.length === 0) {
            isQueuePlaying = false;
            return;
        }

        const nextKey = currentQueue.shift();
        const src = AUDIO_MAP[nextKey];
        if (!src) {
            playNext();
            return;
        }

        ctx.src = src;
        ctx.play();
    }

    ctx.onEnded(playNext);
    ctx.onError((err) => {
        console.error('音频队列播放失败', err);
        playNext();
    });

    playNext();
}

/**
 * 播报结算总额
 * @param {number} amount 结算金额
 */
function playSettlementAmount(amount) {
    const list = convertAmountToAudioList(amount);
    playQueue(list);
}

module.exports = {
    playKey,
    playSettlementAmount,
    stop,
    AUDIO_MAP
};
