const cloud = require('../../utils/supabase.js');
const receiptDrawer = require('../../utils/receiptDrawer.js');
const voiceManager = require('../../utils/voiceManager.js');

const DEFAULT_CATEGORIES = [
    { id: 1, name: '黄纸板', price: 1.20 },
    { id: 2, name: '统纸', price: 0.90 },
    { id: 3, name: '废铁', price: 0.85 },
    { id: 4, name: '易拉罐', price: 4.50 },
    { id: 5, name: '废铜', price: 25.00 },
    { id: 6, name: '塑料瓶', price: 1.50 }
];

const DEFAULT_CUSTOMERS = [
    { id: 1, name: '顾客 1', invoice: [], inputFormula: '', formulas: {}, lastClearedFormulas: {} },
    { id: 2, name: '顾客 2', invoice: [], inputFormula: '', formulas: {}, lastClearedFormulas: {} },
    { id: 3, name: '顾客 3', invoice: [], inputFormula: '', formulas: {}, lastClearedFormulas: {} }
];

const TUTORIAL_STEPS = [
    {
        title: '顾客管理 (排队不乱)',
        content: '支持同时记录多位顾客的废品。当多个顾客排队时，点击上方标签即可在不同顾客的清单间自由切换。',
        target: '#customer-tabs',
        align: 'bottom'
    },
    {
        title: '进阶：修改长期单价',
        content: '点击品类卡片右上角的【✏️】小图标，即可随时修改该品类的基础回收单价，或将其删除。',
        target: '.edit-price-icon',
        align: 'bottom'
    },
    {
        title: '进阶：新增废品品类',
        content: '点击品类面板右上角的【⚙️】图标，即可新增自定义的废品品类，满足各种特殊回收需求。',
        target: '.manage-btn',
        align: 'bottom'
    },
    {
        title: '第一步：选择品类',
        content: '点击顾客需要卖的废品品类（如【黄纸板】），即可唤起底部的称重计算器。',
        target: '#category-grid',
        align: 'bottom'
    },
    {
        title: '第二步：计重与临时调价',
        content: '使用软键盘输入称重重量。顶部的【临时调价】可以根据行情临时微调单价。完成后点击【加入清单】。',
        target: '#modal-calculator',
        align: 'top'
    },
    {
        title: '第三步：清单汇总与结算',
        content: '已加入的废品会汇总在下方的【当前交易清单】。确认无误后，点击【确认结算并入账】完成交易。',
        target: '#invoice-card',
        align: 'top'
    },
    {
        title: '第四步：查看历史与小票',
        content: '交易完成后会记录在【历史账本】。在此处你可以查看今日业绩，一键生成正规【电子小票】长图发微信或保存相册。',
        target: '#nav-history',
        align: 'top'
    }
];

Page({
    data: {
        tutorialActive: false,
        tutorialStepIndex: 0,
        tutorialTitle: '',
        tutorialContent: '',
        tutorialStepsCount: 7,
        highlightStyle: '',
        tooltipStyle: '',
        tooltipAlign: 'bottom',
        maskTopStyle: '',
        maskBottomStyle: '',
        maskLeftStyle: '',
        maskRightStyle: '',
        tutorialVoiceMuted: false,

        unit: 'jin',
        fontScale: 1.0,
        fontScaleDisplay: '1.0',
        voiceEnabled: true,
        categories: [],
        selectedCatId: null,
        tempPrice: 0,
        tempPriceDisplay: '0.00',
        selectedCatName: '',
        customerCounter: 3,
        customers: [],
        activeCustomerId: null,
        history: [],
        activePage: 'book',
        
        settingsModalActive: false,

        modalEditPriceActive: false,
        editCatName: '',
        inputEditPrice: '',
        editingCatId: null,

        modalTempPriceActive: false,
        inputTempPrice: '',

        modalManageCatActive: false,
        inputNewCatName: '',
        inputNewCatPrice: '',

        inputFormulaDisplay: '',
        inputResultDisplay: '0',
        lastClearedFormulas: [],
        calculatorActive: false,
        translateY: 0,
        transitionStyle: '',

        currentInvoice: [],
        invoiceSumDisplay: '0.00',

        todayTotalMoneyDisplay: '0.00',
        todayTotalCount: 0,

        // 电子小票配置与状态
        storeName: '绿色废品回收站',
        storePhone: '',
        receiptModalActive: false,
        receiptImgUrl: '',
        receiptCanvasWidth: 375,
        receiptCanvasHeight: 520,
        currentReceiptBill: null
    },

    onLoad() {
        if (wx.setInnerAudioOption) {
            wx.setInnerAudioOption({
                obeyMuteSwitch: false,
                mixWithOther: true
            });
        }

        this.setData({ 
            isCloudSyncing: true,
            tutorialVoiceMuted: wx.getStorageSync('app_tutorialVoiceMuted') || false
        });

        if (!cloud.enabled) {
            wx.showToast({ title: '云端未配置，使用本地模式', icon: 'none' });
            this.loadFromLocal();
            this.setData({ isCloudSyncing: false });
            return;
        }

        const db = cloud.database();
        db.collection('user_data').get().then(res => {
            if (res.data.length > 0) {
                // 读取云端配置
                const cloudData = res.data[0];
                this.setData({
                    cloudDocId: cloudData._id,
                    unit: cloudData.unit || 'jin',
                    fontScale: cloudData.fontScale || 1.0,
                    fontScaleDisplay: (cloudData.fontScale || 1.0).toFixed(1),
                    voiceEnabled: cloudData.voiceEnabled !== undefined ? cloudData.voiceEnabled : true,
                    storeName: cloudData.storeName || wx.getStorageSync('app_storeName') || '绿色废品回收站',
                    storePhone: cloudData.storePhone || wx.getStorageSync('app_storePhone') || '',
                    categories: cloudData.categories || DEFAULT_CATEGORIES,
                    customerCounter: cloudData.customerCounter || 3,
                    customers: cloudData.customers || DEFAULT_CUSTOMERS
                }, () => {
                    this.loadCloudHistory(db);
                });
            } else {
                // 云端无数据，使用本地数据并上传到云端
                this.loadFromLocalAndUpload(db);
            }
        }).catch(err => {
            console.error('云端获取失败', err);
            this.loadFromLocal();
            this.setData({ isCloudSyncing: false });
        });
    },

    onHide() {
        voiceManager.stop();
        this.stopVoice();
        this.stopTutorialVoice();
    },

    onUnload() {
        voiceManager.stop();
        this.stopVoice();
        this.stopTutorialVoice();
    },

    loadFromLocal() {
        const unit = wx.getStorageSync('app_unit') || 'jin';
        const fontScale = wx.getStorageSync('app_fontScale') || 1.0;
        let voiceEnabled = wx.getStorageSync('app_voiceEnabled');
        if (voiceEnabled === '') voiceEnabled = true;
        const storeName = wx.getStorageSync('app_storeName') || '绿色废品回收站';
        const storePhone = wx.getStorageSync('app_storePhone') || '';
        const categories = wx.getStorageSync('app_categories') || DEFAULT_CATEGORIES;
        const customerCounter = parseInt(wx.getStorageSync('app_cust_counter')) || 3;
        const customers = wx.getStorageSync('app_customers') || DEFAULT_CUSTOMERS;
        const history = wx.getStorageSync('app_history') || [];

        let activeCustomerId = customers.length > 0 ? customers[0].id : null;
        let selectedCatId = categories.length > 0 ? categories[0].id : null;

        this.setData({
            unit, fontScale, fontScaleDisplay: fontScale.toFixed(1), voiceEnabled,
            storeName, storePhone,
            categories, customerCounter, customers, history, activeCustomerId, selectedCatId
        }, () => {
            if (selectedCatId) {
                this.selectCategory({ currentTarget: { dataset: { id: selectedCatId } } }, false);
            }
            this.updateInputDisplay();
            this.renderInvoice();
            this.updateStats();
            this.checkAutoStartTutorial();
        });
    },

    loadFromLocalAndUpload(db) {
        this.loadFromLocal();
        const { unit, fontScale, voiceEnabled, storeName, storePhone, categories, customerCounter, customers, history } = this.data;
        
        // 创建云端配置文档
        db.collection('user_data').add({
            data: { unit, fontScale, voiceEnabled, storeName, storePhone, categories, customerCounter, customers }
        }).then(res => {
            this.setData({ cloudDocId: res._id });
            this.setData({ isCloudSyncing: false });
        }).catch(err => {
            console.error('云端初始上传失败', err);
            this.setData({ isCloudSyncing: false });
        });
    },

    loadCloudHistory(db) {
        db.collection('history_bills').orderBy('time', 'desc').limit(100).get().then(res => {
            let activeCustomerId = this.data.customers.length > 0 ? this.data.customers[0].id : null;
            let selectedCatId = this.data.categories.length > 0 ? this.data.categories[0].id : null;

            this.setData({
                history: res.data,
                activeCustomerId,
                selectedCatId,
                isCloudSyncing: false
            }, () => {
                if (selectedCatId) {
                    this.selectCategory({ currentTarget: { dataset: { id: selectedCatId } } }, false);
                }
                this.updateInputDisplay();
                this.renderInvoice();
                this.updateStats();
                this.checkAutoStartTutorial();
            });
        }).catch(err => {
            console.error('拉取历史失败', err);
            this.setData({ isCloudSyncing: false });
        });
    },

    syncCloudData() {
        if (!cloud.enabled || !this.data.cloudDocId) return;
        const { unit, fontScale, voiceEnabled, storeName, storePhone, categories, customerCounter, customers } = this.data;
        cloud.database().collection('user_data').doc(this.data.cloudDocId).update({
            data: { unit, fontScale, voiceEnabled, storeName, storePhone, categories, customerCounter, customers }
        });
    },

    saveCustomers() {
        wx.setStorageSync('app_customers', this.data.customers);
        this.syncCloudData();
    },

    saveHistory() {
        wx.setStorageSync('app_history', this.data.history);
    },

    getCurrentCustomer() {
        return this.data.customers.find(c => c.id === this.data.activeCustomerId);
    },

    switchCustomer(e) {
        const id = e.currentTarget.dataset.id;
        this.setData({ activeCustomerId: id }, () => {
            this.updateInputDisplay();
            this.renderInvoice();
        });
    },

    addNewCustomer() {
        let counter = this.data.customerCounter + 1;
        wx.setStorageSync('app_cust_counter', counter);

        const newId = Date.now() + Math.random();
        const newCustomer = {
            id: newId,
            name: '顾客 ' + counter,
            invoice: [],
            inputFormula: '',
            formulas: {},
            lastClearedFormulas: {}
        };

        const customers = this.data.customers;
        customers.push(newCustomer);

        this.setData({
            customerCounter: counter,
            customers: customers,
            activeCustomerId: newId
        }, () => {
            wx.setStorageSync('app_cust_counter', counter);
            this.syncCloudData();
            this.saveCustomers();
            this.updateInputDisplay();
            this.renderInvoice();
        });
    },
    
    openAddCustomerModal() {
        this.addNewCustomer();
    },

    openSettingsModal() {
        this.setData({ settingsModalActive: true });
    },

    closeSettingsModal() {
        this.setData({ settingsModalActive: false });
    },

    onInputStoreName(e) {
        const val = e.detail.value;
        this.setData({ storeName: val });
        wx.setStorageSync('app_storeName', val);
        this.syncCloudData();
    },

    onInputStorePhone(e) {
        const val = e.detail.value;
        this.setData({ storePhone: val });
        wx.setStorageSync('app_storePhone', val);
        this.syncCloudData();
    },

    adjustFontScale(e) {
        const delta = parseFloat(e.currentTarget.dataset.delta);
        const newScale = Math.max(0.8, Math.min(1.5, this.data.fontScale + delta));
        
        this.setData({ 
            fontScale: newScale,
            fontScaleDisplay: newScale.toFixed(1)
        }, () => {
            wx.setStorageSync('app_fontScale', newScale);
            this.syncCloudData();
        });
    },

    switchVoice(e) {
        const enabled = e.currentTarget.dataset.enabled === '1';
        this.setData({ voiceEnabled: enabled }, () => {
            wx.setStorageSync('app_voiceEnabled', enabled);
            this.syncCloudData();
            if (!enabled) {
                voiceManager.stop();
            }
            wx.showToast({
                title: enabled ? '语音已开启' : '语音已关闭',
                icon: 'none'
            });
        });
    },

    playKeySound(key) {
        if (!this.data.voiceEnabled) {
            // 语音关闭时依然保留微震动反馈
            wx.vibrateShort({ type: 'light' });
            return;
        }
        voiceManager.playKey(key, true);
    },

    playSettlementVoice(amount) {
        if (!this.data.voiceEnabled) return;
        voiceManager.playSettlementAmount(amount);
    },

    playVoice(text) {
        if (!this.data.voiceEnabled) return;
        // 如果是已知按键/短语，优先走本地纯离线零延迟引擎
        if (voiceManager.AUDIO_MAP[text]) {
            voiceManager.playKey(text, true);
            return;
        }
        // 兜底外网 TTS
        if (this._voiceAudio) {
            try {
                this._voiceAudio.stop();
                this._voiceAudio.destroy();
            } catch (e) {}
            this._voiceAudio = null;
        }
        const audio = wx.createInnerAudioContext();
        this._voiceAudio = audio;
        audio.autoplay = true;
        audio.onEnded(() => {
            audio.destroy();
            if (this._voiceAudio === audio) this._voiceAudio = null;
        });
        audio.onError((res) => {
            console.error('Audio playback failed', res.errMsg);
            audio.destroy();
            if (this._voiceAudio === audio) this._voiceAudio = null;
        });
        audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=zh`;
        audio.play();
    },

    stopVoice() {
        voiceManager.stop();
        if (this._voiceAudio) {
            try {
                this._voiceAudio.stop();
                this._voiceAudio.destroy();
            } catch (e) {}
            this._voiceAudio = null;
        }
    },

    playTutorialVoice(stepIndex) {
        if (this.data.tutorialVoiceMuted) {
            this.stopTutorialVoice();
            return;
        }
        this.stopTutorialVoice();
        const audio = wx.createInnerAudioContext();
        this.tutorialVoiceAudio = audio;
        audio.onEnded(() => {
            audio.destroy();
            if (this.tutorialVoiceAudio === audio) this.tutorialVoiceAudio = null;
        });
        audio.onError((res) => {
            console.error('Tutorial audio playback failed', res.errMsg, res.errCode);
            audio.destroy();
            if (this.tutorialVoiceAudio === audio) this.tutorialVoiceAudio = null;
        });
        // 播放预生成的本地音频文件，避免运行时依赖不稳定的第三方 TTS 接口
        audio.src = `/audio/tutorial_step${stepIndex + 1}.mp3`;
        audio.play();
    },

    stopTutorialVoice() {
        if (this.tutorialVoiceAudio) {
            try {
                this.tutorialVoiceAudio.stop();
                this.tutorialVoiceAudio.destroy();
            } catch (e) {
                console.error(e);
            }
            this.tutorialVoiceAudio = null;
        }
    },

    toggleTutorialVoice() {
        const muted = !this.data.tutorialVoiceMuted;
        this.setData({ tutorialVoiceMuted: muted }, () => {
            wx.setStorageSync('app_tutorialVoiceMuted', muted);
            if (muted) {
                this.stopTutorialVoice();
                wx.showToast({ title: '引导语音已静音', icon: 'none' });
            } else {
                wx.showToast({ title: '引导语音已开启', icon: 'none' });
                // 重新播放当前步骤的声音
                this.playTutorialVoice(this.data.tutorialStepIndex);
            }
        });
    },

    switchUnit(e) {
        const unit = e.currentTarget.dataset.unit;
        this.setData({ unit }, () => {
            wx.setStorageSync('app_unit', unit);
            this.syncCloudData();
            
            if (this.data.selectedCatId) {
                this.selectCategory({ currentTarget: { dataset: { id: this.data.selectedCatId } } }, false);
            }
            wx.showToast({
                title: `已切换为 按${unit === 'jin' ? '斤' : '公斤'}计价`,
                icon: 'none'
            });
        });
    },

    getDisplayPrice(basePriceJin, returnNum = false) {
        let price = this.data.unit === 'kg' ? basePriceJin * 2 : basePriceJin;
        return returnNum ? price : parseFloat(price).toFixed(2);
    },

    selectCategory(e, openCalc = true) {
        const id = e.currentTarget.dataset.id;
        const cat = this.data.categories.find(c => c.id === id);
        
        let tempPrice = 0;
        let selectedCatName = '';
        if (cat) {
            tempPrice = this.getDisplayPrice(cat.price, true);
            selectedCatName = cat.name;
        }

        const categories = this.data.categories.map(c => ({
            ...c,
            displayPriceJin: parseFloat(c.price).toFixed(2),
            displayPriceKg: parseFloat(c.price * 2).toFixed(2)
        }));

        let updateData = {
            selectedCatId: id,
            tempPrice,
            tempPriceDisplay: tempPrice.toFixed(2),
            selectedCatName,
            categories
        };

        if (openCalc) {
            updateData.calculatorActive = true;
        }

        this.setData(updateData, () => {
            this.updateInputDisplay();
        });
    },

    closeCalculator() {
        voiceManager.stop();
        this.setData({ calculatorActive: false, translateY: 0, transitionStyle: '' });
    },

    stopBubble() {},

    onTouchStart(e) {
        this.startY = e.touches[0].clientY;
        this.isDragging = true;
        this.setData({ transitionStyle: 'none' });
    },

    onTouchMove(e) {
        if (!this.isDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - this.startY;
        if (deltaY > 0) {
            this.setData({ translateY: deltaY });
        }
    },

    onTouchEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        const currentY = e.changedTouches[0].clientY;
        const deltaY = currentY - this.startY;

        if (deltaY > 100) {
            this.setData({
                translateY: 1000,
                transitionStyle: 'transform 0.3s ease-out'
            });
            setTimeout(() => {
                this.closeCalculator();
            }, 300);
        } else {
            this.setData({
                translateY: 0,
                transitionStyle: 'transform 0.3s ease-out'
            });
        }
    },

    adjustTempPrice(e) {
        const delta = parseFloat(e.currentTarget.dataset.delta);
        let newPrice = this.data.tempPrice + delta;
        if (newPrice < 0) newPrice = 0;
        newPrice = Math.round(newPrice * 100) / 100;
        this.setData({
            tempPrice: newPrice,
            tempPriceDisplay: newPrice.toFixed(2)
        });
    },

    openTempPriceModal() {
        this.setData({
            modalTempPriceActive: true,
            inputTempPrice: this.data.tempPrice.toFixed(2)
        });
    },

    onInputTempPrice(e) {
        this.setData({ inputTempPrice: e.detail.value });
    },

    confirmTempPrice() {
        const val = parseFloat(this.data.inputTempPrice);
        if (!isNaN(val) && val >= 0) {
            this.setData({
                tempPrice: val,
                tempPriceDisplay: val.toFixed(2),
                modalTempPriceActive: false
            });
        } else {
            wx.showToast({ title: '请输入有效单价', icon: 'none' });
        }
    },

    inputKey(e) {
        const key = e.currentTarget.dataset.key;
        let customers = this.data.customers;
        const customerIdx = customers.findIndex(c => c.id === this.data.activeCustomerId);
        if (customerIdx === -1) return;
        
        let curr = customers[customerIdx];
        const catId = this.data.selectedCatId;
        if (!catId) return;

        if (!curr.formulas) curr.formulas = {};
        if (!curr.lastClearedFormulas) curr.lastClearedFormulas = {};

        if (typeof curr.lastClearedFormulas[catId] === 'string') {
            curr.lastClearedFormulas[catId] = curr.lastClearedFormulas[catId] ? [curr.lastClearedFormulas[catId]] : [];
        }
        if (!Array.isArray(curr.lastClearedFormulas[catId])) {
            curr.lastClearedFormulas[catId] = [];
        }

        if (curr.inputFormula && !curr.formulas[catId]) {
            curr.formulas[catId] = curr.inputFormula;
            curr.inputFormula = '';
        }

        let formula = curr.formulas[catId] || '';

        if (key === 'C') {
            if (formula) {
                curr.lastClearedFormulas[catId].unshift(formula);
                if (curr.lastClearedFormulas[catId].length > 3) {
                    curr.lastClearedFormulas[catId].pop();
                }
            }
            formula = '';
            this.playKeySound('C');
        } else if (key === 'back') {
            formula = formula.slice(0, -1);
            this.playKeySound('back');
        } else {
            const lastChar = formula.slice(-1);
            if ((key === '+' || key === '-' || key === '.') && (lastChar === '+' || lastChar === '-' || lastChar === '.' || formula === '')) {
                return;
            }
            if (formula.length > 20) {
                wx.showToast({ title: '输入太长了', icon: 'none' });
                return;
            }
            formula += key;
            this.playKeySound(key);
        }

        curr.formulas[catId] = formula;
        customers[customerIdx] = curr;

        this.setData({ customers }, () => {
            this.saveCustomers();
            this.updateInputDisplay();
        });
    },

    restoreFormula(e) {
        const index = e.currentTarget.dataset.index;
        let customers = this.data.customers;
        const customerIdx = customers.findIndex(c => c.id === this.data.activeCustomerId);
        if (customerIdx === -1) return;
        
        let curr = customers[customerIdx];
        const catId = this.data.selectedCatId;
        if (!catId || !curr.lastClearedFormulas || !Array.isArray(curr.lastClearedFormulas[catId])) return;

        if (!curr.formulas) curr.formulas = {};

        const restored = curr.lastClearedFormulas[catId][index];
        curr.lastClearedFormulas[catId].splice(index, 1);

        const currentFormula = curr.formulas[catId] || '';
        if (currentFormula) {
            curr.lastClearedFormulas[catId].unshift(currentFormula);
            if (curr.lastClearedFormulas[catId].length > 3) {
                curr.lastClearedFormulas[catId].pop();
            }
        }

        curr.formulas[catId] = restored;
        customers[customerIdx] = curr;

        this.setData({ customers }, () => {
            this.saveCustomers();
            this.updateInputDisplay();
        });
    },

    getCalculatedWeight() {
        const curr = this.getCurrentCustomer();
        const catId = this.data.selectedCatId;
        let formula = '';
        if (curr && catId) {
            formula = (curr.formulas && curr.formulas[catId]) ? curr.formulas[catId] : (curr.inputFormula || '');
        }
        if (!formula) return 0;

        try {
            let cleanFormula = formula;
            if (cleanFormula.endsWith('+') || cleanFormula.endsWith('-') || cleanFormula.endsWith('.')) {
                cleanFormula = cleanFormula.slice(0, -1);
            }
            if (/^[0-9\+\-\.]+$/.test(cleanFormula)) {
                return this.evaluateFormula(cleanFormula) || 0;
            }
            return 0;
        } catch (e) {
            return 0;
        }
    },

    evaluateFormula(str) {
        const tokens = str.split(/(?=[+-])|(?<=[+-])/).filter(t => t.trim() !== '');
        let result = parseFloat(tokens[0]) || 0;
        for (let i = 1; i < tokens.length; i += 2) {
            const op = tokens[i];
            const val = parseFloat(tokens[i+1]) || 0;
            if (op === '+') result += val;
            else if (op === '-') result -= val;
        }
        return result;
    },

    updateInputDisplay() {
        const curr = this.getCurrentCustomer();
        const catId = this.data.selectedCatId;
        let formula = '';
        let lastClearedArr = [];

        if (curr && catId) {
            formula = (curr.formulas && curr.formulas[catId]) ? curr.formulas[catId] : (curr.inputFormula || '');
            if (curr.lastClearedFormulas && curr.lastClearedFormulas[catId]) {
                if (typeof curr.lastClearedFormulas[catId] === 'string') {
                    if (curr.lastClearedFormulas[catId] !== '') {
                        lastClearedArr = [curr.lastClearedFormulas[catId]];
                    }
                } else if (Array.isArray(curr.lastClearedFormulas[catId])) {
                    lastClearedArr = curr.lastClearedFormulas[catId];
                }
            }
            
            let hasFormulas = false;
            for(let key in curr.formulas) {
                if(curr.formulas[key]) {
                    hasFormulas = true;
                    break;
                }
            }
            curr.hasFormulas = hasFormulas;
        }

        const res = this.getCalculatedWeight();
        let displayRes = res.toString();
        if (displayRes.indexOf('.') !== -1) {
            displayRes = parseFloat(res.toPrecision(12)).toString();
        }

        this.setData({
            inputFormulaDisplay: formula,
            lastClearedFormulas: lastClearedArr,
            inputResultDisplay: formula ? displayRes : '0',
            customers: this.data.customers
        });
    },

    addToInvoice() {
        const weight = this.getCalculatedWeight();
        if (weight <= 0) {
            wx.showToast({ title: '请输入有效重量', icon: 'none' });
            return;
        }
        const cat = this.data.categories.find(c => c.id === this.data.selectedCatId);
        if (!cat) return;

        const unitPrice = this.data.tempPrice;
        const total = parseFloat((weight * unitPrice).toFixed(2));

        let customers = this.data.customers;
        const customerIdx = customers.findIndex(c => c.id === this.data.activeCustomerId);
        let curr = customers[customerIdx];

        curr.invoice.push({
            id: Date.now(),
            catName: cat.name,
            weight: weight,
            unit: this.data.unit === 'jin' ? '斤' : '公斤',
            unitPrice: unitPrice,
            unitPriceDisplay: unitPrice.toFixed(2),
            total: total,
            totalDisplay: total.toFixed(2)
        });

        if (!curr.formulas) curr.formulas = {};
        if (!curr.lastClearedFormulas) curr.lastClearedFormulas = {};
        curr.formulas[this.data.selectedCatId] = '';
        curr.lastClearedFormulas[this.data.selectedCatId] = [];
        curr.inputFormula = '';

        customers[customerIdx] = curr;

        this.setData({ customers, calculatorActive: false }, () => {
            this.saveCustomers();
            this.updateInputDisplay();
            this.renderInvoice();

            this.playKeySound('add');
            wx.showToast({ title: '已加入清单', icon: 'success' });
            this.closeCalculator();
        });
    },

    removeInvoiceItem(e) {
        const id = e.currentTarget.dataset.id;
        let customers = this.data.customers;
        const customerIdx = customers.findIndex(c => c.id === this.data.activeCustomerId);
        let curr = customers[customerIdx];

        curr.invoice = curr.invoice.filter(item => item.id !== id);
        customers[customerIdx] = curr;

        this.setData({ customers }, () => {
            this.saveCustomers();
            this.renderInvoice();
        });
    },

    renderInvoice() {
        const curr = this.getCurrentCustomer();
        if (!curr) return;
        
        let sum = curr.invoice.reduce((acc, item) => acc + item.total, 0);

        this.setData({
            currentInvoice: curr.invoice,
            invoiceSumDisplay: sum.toFixed(2)
        });
    },

    settleInvoice() {
        let customers = this.data.customers;
        const customerIdx = customers.findIndex(c => c.id === this.data.activeCustomerId);
        let curr = customers[customerIdx];

        if (curr.invoice.length === 0) return;

        let sum = curr.invoice.reduce((acc, item) => acc + item.total, 0);

        const record = {
            id: Date.now(),
            time: new Date().getTime(),
            total: sum,
            items: [...curr.invoice]
        };

        let history = this.data.history;
        history.unshift(record);

        if (cloud.enabled) {
            cloud.database().collection('history_bills').add({
                data: record
            }).catch(err => console.error('云端历史保存失败', err));
        }

        history = this.formatHistory(history);

        customers = customers.filter(c => c.id !== curr.id);

        let customerCounter = this.data.customerCounter;
        while (customers.length < 3) {
            customerCounter++;
            wx.setStorageSync('app_cust_counter', customerCounter);
            customers.push({
                id: Date.now() + Math.random(),
                name: '顾客 ' + customerCounter,
                invoice: [],
                inputFormula: '',
                formulas: {},
                lastClearedFormulas: {}
            });
        }

        this.setData({
            history,
            customers,
            customerCounter,
            activeCustomerId: customers[0].id
        }, () => {
            this.saveHistory();
            this.saveCustomers();
            this.updateInputDisplay();
            this.renderInvoice();
            this.updateStats();

            this.playSettlementVoice(sum);
            wx.vibrateShort();
            wx.showModal({
                title: '结算成功',
                content: `本次结算 ￥${sum.toFixed(2)}，是否生成并查看电子回收小票？`,
                confirmText: '查看小票',
                cancelText: '完成',
                confirmColor: '#0F5A3E',
                success: (mRes) => {
                    if (mRes.confirm) {
                        this.generateReceipt(record);
                    }
                }
            });
        });
    },

    openReceiptFromHistory(e) {
        const item = e.currentTarget.dataset.item;
        if (item) {
            this.generateReceipt(item);
        }
    },

    generateReceipt(bill) {
        if (!bill) return;
        wx.showLoading({ title: '正在生成小票...', mask: true });

        const calculatedHeight = receiptDrawer.calculateReceiptHeight(bill);
        const width = 375;

        this.setData({
            receiptCanvasWidth: width,
            receiptCanvasHeight: calculatedHeight,
            currentReceiptBill: bill
        }, () => {
            // 给 canvas 节点尺寸更新预留短暂延时
            setTimeout(() => {
                const query = wx.createSelectorQuery();
                query.select('#receiptCanvas')
                    .fields({ node: true, size: true })
                    .exec((res) => {
                        if (!res || !res[0] || !res[0].node) {
                            wx.hideLoading();
                            wx.showToast({ title: '小票生成组件就绪中，请重试', icon: 'none' });
                            return;
                        }
                        const canvas = res[0].node;
                        try {
                            receiptDrawer.renderReceipt(canvas, {
                                bill: bill,
                                storeName: this.data.storeName || '绿色废品回收站',
                                storePhone: this.data.storePhone || '',
                                width: width,
                                height: calculatedHeight
                            });

                            // 导出为临时图片路径
                            wx.canvasToTempFilePath({
                                canvas: canvas,
                                fileType: 'png',
                                quality: 1,
                                success: (fileRes) => {
                                    wx.hideLoading();
                                    this.setData({
                                        receiptImgUrl: fileRes.tempFilePath,
                                        receiptModalActive: true
                                    });
                                    wx.vibrateShort({ type: 'light' });
                                },
                                fail: (err) => {
                                    wx.hideLoading();
                                    console.error('导出小票图片失败', err);
                                    wx.showToast({ title: '生成小票失败', icon: 'none' });
                                }
                            });
                        } catch (drawErr) {
                            wx.hideLoading();
                            console.error('绘制小票异常', drawErr);
                            wx.showToast({ title: '绘制异常', icon: 'none' });
                        }
                    });
            }, 180);
        });
    },

    closeReceiptModal() {
        this.setData({ receiptModalActive: false });
    },

    saveReceiptToPhotos() {
        if (!this.data.receiptImgUrl) return;
        wx.saveImageToPhotosAlbum({
            filePath: this.data.receiptImgUrl,
            success: () => {
                wx.showToast({ title: '已保存到相册', icon: 'success' });
            },
            fail: (err) => {
                if (err.errMsg && (err.errMsg.indexOf('auth deny') >= 0 || err.errMsg.indexOf('authorize:fail') >= 0)) {
                    wx.showModal({
                        title: '授权提示',
                        content: '保存小票需要相册保存权限，请在设置中开启',
                        confirmText: '去设置',
                        success: (res) => {
                            if (res.confirm) wx.openSetting();
                        }
                    });
                } else {
                    wx.showToast({ title: '已取消保存', icon: 'none' });
                }
            }
        });
    },

    previewReceiptImage() {
        if (!this.data.receiptImgUrl) return;
        wx.previewImage({
            urls: [this.data.receiptImgUrl],
            current: this.data.receiptImgUrl
        });
    },

    formatHistory(historyArr) {
        return historyArr.map(record => {
            const date = new Date(record.time);
            const mo = (date.getMonth() + 1).toString().padStart(2, '0');
            const d = date.getDate().toString().padStart(2, '0');
            const h = date.getHours().toString().padStart(2, '0');
            const m = date.getMinutes().toString().padStart(2, '0');
            const y = date.getFullYear();

            const timeStr = `${mo}-${d} ${h}:${m}`;
            const itemsText = record.items.map(i => `${i.catName} ${i.weight}${i.unit} (${i.total}元)`).join(' + ');
            const copyTextStr = `${y}-${mo}-${d} ${h}:${m} 结算总额${record.total.toFixed(2)}元：${itemsText}`;

            return {
                ...record,
                totalDisplay: record.total.toFixed(2),
                timeStr,
                itemsText,
                copyTextStr
            };
        });
    },

    undoHistory(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认',
            content: '确定要撤回并删除这笔历史记录吗？金额将从今日统计中扣除。',
            success: (res) => {
                if (res.confirm) {
                    let history = this.data.history.filter(r => r.id !== id);
                    if (cloud.enabled) {
                        cloud.database().collection('history_bills').where({ id: id }).remove().catch(err => console.error('云端删除失败', err));
                    }
                    this.setData({ history }, () => {
                        this.saveHistory();
                        this.updateStats();
                        wx.showToast({ title: '已撤回删除', icon: 'none' });
                    });
                }
            }
        });
    },

    updateStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();

        let todayTotal = 0;
        let todayCount = 0;

        this.data.history.forEach(r => {
            if (r.time >= todayTime) {
                todayTotal += r.total;
                todayCount++;
            }
        });

        this.setData({
            todayTotalMoneyDisplay: todayTotal.toFixed(2),
            todayTotalCount: todayCount
        });
    },

    switchPage(e) {
        const page = e.currentTarget.dataset.page;
        this.setData({ activePage: page });
        if (page === 'history') {
            this.setData({ history: this.formatHistory(this.data.history) });
        }
    },

    copyText(e) {
        const text = e.currentTarget.dataset.text;
        wx.setClipboardData({
            data: text,
            success: () => {
                wx.showToast({ title: '复制成功，快去粘贴给微信好友。', icon: 'none' });
            },
            fail: () => {
                wx.showToast({ title: '复制失败', icon: 'none' });
            }
        });
    },

    closeModal(e) {
        const modalId = e.currentTarget.dataset.id;
        this.setData({ [modalId]: false });
    },

    openEditPriceModal(e) {
        const catId = e.currentTarget.dataset.id;
        const cat = this.data.categories.find(c => c.id === catId);
        if (!cat) return;

        this.setData({
            editingCatId: catId,
            editCatName: cat.name,
            inputEditPrice: this.getDisplayPrice(cat.price, false),
            modalEditPriceActive: true
        });
    },

    onInputEditPrice(e) {
        this.setData({ inputEditPrice: e.detail.value });
    },

    confirmEditPrice() {
        const val = parseFloat(this.data.inputEditPrice);
        if (isNaN(val) || val < 0) {
            wx.showToast({ title: '请输入有效价格', icon: 'none' });
            return;
        }

        const basePriceJin = this.data.unit === 'kg' ? val / 2 : val;
        
        let categories = this.data.categories;
        const catIdx = categories.findIndex(c => c.id === this.data.editingCatId);
        if (catIdx > -1) {
            categories[catIdx].price = basePriceJin;
            
            categories = categories.map(c => ({
                ...c,
                displayPriceJin: parseFloat(c.price).toFixed(2),
                displayPriceKg: parseFloat(c.price * 2).toFixed(2)
            }));

            this.setData({ categories, modalEditPriceActive: false }, () => {
                wx.setStorageSync('app_categories', this.data.categories);
                this.syncCloudData();
                
                if (this.data.editingCatId === this.data.selectedCatId) {
                    const tempPrice = parseFloat(this.getDisplayPrice(basePriceJin, true));
                    this.setData({
                        tempPrice,
                        tempPriceDisplay: tempPrice.toFixed(2)
                    });
                }
                
                wx.showToast({ title: '修改成功', icon: 'success' });
            });
        }
    },

    deleteCategory() {
        wx.showModal({
            title: '确认',
            content: '确定要删除该品类吗？',
            success: (res) => {
                if (res.confirm) {
                    let categories = this.data.categories.filter(c => c.id !== this.data.editingCatId);
                    
                    this.setData({ categories, modalEditPriceActive: false }, () => {
                        wx.setStorageSync('app_categories', this.data.categories);
                        this.syncCloudData();
                        
                        if (this.data.selectedCatId === this.data.editingCatId) {
                            if (categories.length > 0) {
                                this.selectCategory({ currentTarget: { dataset: { id: categories[0].id } } });
                            } else {
                                this.setData({
                                    selectedCatId: null,
                                    tempPrice: 0,
                                    tempPriceDisplay: '0.00',
                                    selectedCatName: '选择废品'
                                });
                            }
                        }
                        
                        wx.showToast({ title: '已删除', icon: 'success' });
                    });
                }
            }
        });
    },

    openManageCatModal() {
        this.setData({
            inputNewCatName: '',
            inputNewCatPrice: '',
            modalManageCatActive: true
        });
    },

    onInputNewCatName(e) {
        this.setData({ inputNewCatName: e.detail.value });
    },
    
    onInputNewCatPrice(e) {
        this.setData({ inputNewCatPrice: e.detail.value });
    },

    confirmAddCategory() {
        const name = this.data.inputNewCatName.trim();
        const val = parseFloat(this.data.inputNewCatPrice);

        if (!name) {
            wx.showToast({ title: '请输入品类名', icon: 'none' });
            return;
        }
        if (isNaN(val) || val < 0) {
            wx.showToast({ title: '无效单价', icon: 'none' });
            return;
        }

        const basePriceJin = this.data.unit === 'kg' ? val / 2 : val;

        const newCat = {
            id: Date.now(),
            name: name,
            price: basePriceJin,
            displayPriceJin: parseFloat(basePriceJin).toFixed(2),
            displayPriceKg: parseFloat(basePriceJin * 2).toFixed(2)
        };

        let categories = this.data.categories;
        categories.push(newCat);

        this.setData({ categories, modalManageCatActive: false }, () => {
            wx.setStorageSync('app_categories', this.data.categories);
            this.syncCloudData();
            wx.showToast({ title: '添加成功', icon: 'success' });
        });
    },

    onShareAppMessage() {
        if (this.data.receiptModalActive && this.data.receiptImgUrl) {
            return {
                title: `${this.data.storeName || '废品回收'} 电子结算单`,
                path: '/pages/index/index',
                imageUrl: this.data.receiptImgUrl
            };
        }
        return {
            title: `${this.data.storeName || '摊友称重计价助手'} - 称重计价收钱与电子小票`,
            path: '/pages/index/index'
        };
    },

    onShareTimeline() {
        return {
            title: '摊友称重计价助手 - 称重记账与电子小票'
        };
    },

    // ==========================================
    // === 新手引导教程 (Interactive Onboarding) ===
    // ==========================================
    checkAutoStartTutorial() {
        // 暂时先让引导每次都自动弹出
        setTimeout(() => {
            this.startTutorial();
        }, 800);
    },

    restartTutorial() {
        this.setData({ settingsModalActive: false });
        setTimeout(() => {
            this.startTutorial();
        }, 300);
    },

    startTutorial() {
        // 备份当前真实数据，避免被演示数据污染
        this.tutorialBackup = {
            unit: this.data.unit,
            categories: JSON.parse(JSON.stringify(this.data.categories)),
            customers: JSON.parse(JSON.stringify(this.data.customers)),
            history: JSON.parse(JSON.stringify(this.data.history)),
            activeCustomerId: this.data.activeCustomerId,
            selectedCatId: this.data.selectedCatId,
            tempPrice: this.data.tempPrice,
            activePage: this.data.activePage,
            calculatorActive: this.data.calculatorActive
        };

        this.setData({
            tutorialActive: true,
            tutorialStepIndex: 0
        }, () => {
            this.showTutorialStep();
        });
    },

    showTutorialStep() {
        if (!this.data.tutorialActive) return;
        const step = TUTORIAL_STEPS[this.data.tutorialStepIndex];
        if (!step) return;

        // 步骤生命周期管理
        if (this.data.tutorialStepIndex <= 3) {
            this.setData({ activePage: 'book', calculatorActive: false });
        } else if (this.data.tutorialStepIndex === 4) {
            const firstCat = this.data.categories[0];
            if (firstCat) {
                const basePrice = this.getDisplayPrice(firstCat.price, true);
                this.setData({
                    selectedCatId: firstCat.id,
                    selectedCatName: firstCat.name,
                    tempPrice: basePrice,
                    tempPriceDisplay: parseFloat(basePrice).toFixed(2),
                    calculatorActive: true,
                    inputFormulaDisplay: '6.5+3.5',
                    inputResultDisplay: '10'
                });
            }
        } else if (this.data.tutorialStepIndex === 5) {
            this.setData({ calculatorActive: false });
            const curr = this.getCurrentCustomer();
            if (curr && curr.invoice.length === 0) {
                const firstCat = this.data.categories[0] || { name: '黄纸板', price: 1.20 };
                const basePrice = this.getDisplayPrice(firstCat.price, true);
                curr.invoice.push({
                    id: 99999,
                    catName: firstCat.name,
                    weight: 10,
                    unit: this.data.unit === 'jin' ? '斤' : '公斤',
                    unitPriceDisplay: parseFloat(basePrice).toFixed(2),
                    totalDisplay: parseFloat(10 * basePrice).toFixed(2)
                });
                this.setData({
                    customers: this.data.customers
                }, () => {
                    this.renderInvoice();
                });
            }
        } else if (this.data.tutorialStepIndex === 6) {
            this.setData({ activePage: 'history', calculatorActive: false });
            if (this.data.history.length === 0) {
                const firstCat = this.data.categories[0] || { name: '黄纸板', price: 1.20 };
                const basePrice = this.getDisplayPrice(firstCat.price, true);
                const totalDisplay = parseFloat(10 * basePrice).toFixed(2);
                const itemsText = `${firstCat.name} 10${this.data.unit === 'jin' ? '斤' : '公斤'} (${totalDisplay}元)`;
                const mockHistoryItem = {
                    id: 88888,
                    timeStr: '07-12 12:00',
                    totalDisplay: totalDisplay,
                    itemsText: itemsText,
                    copyTextStr: `结算总额${totalDisplay}元：${itemsText}`
                };
                this.setData({
                    history: [mockHistoryItem],
                    todayTotalMoneyDisplay: totalDisplay,
                    todayTotalCount: 1
                });
            }
        }

        this.setData({
            tutorialTitle: step.title,
            tutorialContent: step.content,
            tutorialStepsCount: TUTORIAL_STEPS.length
        }, () => {
            this.playTutorialVoice(this.data.tutorialStepIndex);
        });

        // 小程序界面渲染有轻微延迟，在 setData 回调或延时 150ms 之后计算高亮框位置
        setTimeout(() => {
            this.updateTutorialLayout();
        }, 150);
    },

    updateTutorialLayout(retryCount = 0) {
        if (!this.data.tutorialActive) return;
        const step = TUTORIAL_STEPS[this.data.tutorialStepIndex];
        if (!step) return;

        let targetSelector = step.target;
        if (targetSelector === '#modal-calculator') {
            targetSelector = '.input-card';
        }

        const query = this.createSelectorQuery();
        query.select(targetSelector).boundingClientRect();
        query.selectViewport().fields({ size: true });
        query.exec(res => {
            const rect = res[0];
            const viewport = res[1];
            if (rect && rect.width > 0 && rect.height > 0 && viewport) {
                const padding = 8;
                const winWidth = viewport.width;
                const winHeight = viewport.height;

                const left = Math.max(0, rect.left - padding);
                const top = Math.max(0, rect.top - padding);
                const width = rect.width + padding * 2;
                const height = rect.height + padding * 2;
                const right = left + width;
                const bottom = top + height;

                const highlightStyle = `left:${left}px;top:${top}px;width:${width}px;height:${height}px;`;

                // 4 块拼接遮罩：用显式 width/height，避免依赖 top+bottom / left+right 撑开(部分真机兼容性差)
                const maskTopStyle = `left:0;top:0;width:100%;height:${top}px;`;
                const maskBottomStyle = `left:0;top:${bottom}px;width:100%;height:${Math.max(0, winHeight - bottom)}px;`;
                const maskLeftStyle = `left:0;top:${top}px;width:${left}px;height:${height}px;`;
                const maskRightStyle = `left:${right}px;top:${top}px;width:${Math.max(0, winWidth - right)}px;height:${height}px;`;

                this.setData({
                    maskTopStyle,
                    maskBottomStyle,
                    maskLeftStyle,
                    maskRightStyle
                });

                this.positionTooltip(rect, step.align, highlightStyle);
            } else if (retryCount < 8) {
                // 元素未找到或尺寸为0(可能在动画或未渲染完成)，延迟重试
                setTimeout(() => {
                    this.updateTutorialLayout(retryCount + 1);
                }, 150);
            }
        });
    },

    positionTooltip(rect, preferAlign, highlightStyle) {
        const sysInfo = wx.getSystemInfoSync();
        const winWidth = sysInfo.windowWidth;
        const winHeight = sysInfo.windowHeight;

        const tooltipWidth = 290;
        const fontScale = this.data.fontScale || 1.0;
        const tooltipHeight = 180 * fontScale + 50; // base height 230px, scales with font scale

        let finalLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
        
        // 左右安全防溢出
        if (finalLeft < 12) finalLeft = 12;
        if (finalLeft + tooltipWidth > winWidth - 12) {
            finalLeft = winWidth - tooltipWidth - 12;
        }

        // 上下位置判定与防溢出
        let align = preferAlign || 'bottom';
        if (align === 'bottom' && rect.bottom + 12 + tooltipHeight > winHeight) {
            align = 'top';
        } else if (align === 'top' && rect.top - 12 - tooltipHeight < 0) {
            align = 'bottom';
        }

        let finalTop = 0;
        if (align === 'bottom') {
            finalTop = rect.bottom + 12;
        } else {
            finalTop = rect.top - tooltipHeight - 12;
        }

        // 垂直安全防溢出
        if (finalTop < 12) finalTop = 12;
        if (finalTop + tooltipHeight > winHeight - 12) {
            finalTop = winHeight - tooltipHeight - 12;
        }

        const tooltipStyle = `
            left: ${finalLeft}px;
            top: ${finalTop}px;
        `;

        this.setData({
            highlightStyle,
            tooltipStyle,
            tooltipAlign: align
        });
    },

    nextTutorialStep() {
        if (this.data.tutorialStepIndex < TUTORIAL_STEPS.length - 1) {
            this.setData({
                tutorialStepIndex: this.data.tutorialStepIndex + 1
            }, () => {
                this.showTutorialStep();
            });
        } else {
            this.finishTutorial();
        }
    },

    prevTutorialStep() {
        if (this.data.tutorialStepIndex > 0) {
            this.setData({
                tutorialStepIndex: this.data.tutorialStepIndex - 1
            }, () => {
                this.showTutorialStep();
            });
        }
    },

    skipTutorial() {
        this.finishTutorial(true);
    },

    finishTutorial(isSkipped = false) {
        this.stopTutorialVoice();
        this.setData({
            tutorialActive: false,
            maskTopStyle: '',
            maskBottomStyle: '',
            maskLeftStyle: '',
            maskRightStyle: '',
            highlightStyle: ''
        });

        wx.setStorageSync('tutorial_completed', 'true');

        // 数据还原
        if (this.tutorialBackup) {
            const backup = this.tutorialBackup;
            this.setData({
                unit: backup.unit,
                categories: backup.categories,
                customers: backup.customers,
                history: backup.history,
                activeCustomerId: backup.activeCustomerId,
                selectedCatId: backup.selectedCatId,
                tempPrice: backup.tempPrice,
                activePage: backup.activePage,
                calculatorActive: backup.calculatorActive,
                maskTopStyle: '',
                maskBottomStyle: '',
                maskLeftStyle: '',
                maskRightStyle: '',
                highlightStyle: ''
            }, () => {
                this.updateInputDisplay();
                this.renderInvoice();
                this.updateStats();
                this.tutorialBackup = null;
            });
        }

        wx.showToast({
            title: isSkipped ? '已跳过操作教学' : '恭喜完成操作教学！',
            icon: 'none',
            duration: 2000
        });
    },

    stopBubble() {
        // 用于阻止点击穿透的空函数
    }
});
