import { _decorator, Color, Component, EventTouch, instantiate, Label, Node, Prefab, Sprite, UITransform, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

// 颜色组
const colorGroup = [
    '#AE6D45',
    '#C5668E',
    '#A5BDD7',
    '#48B4B4',
    '#E1BA45',
    '#69BCE8',
    '#9078CE',
    '#ABD893',
    '#E7A8C1',
    '#6082B7',
    '#FFA6E7',
    '#FDA872'
];

@ccclass('GameBoxManage')
export class GameBoxManage extends Component {
    // 子节点预载体
    @property(Prefab)
    private BoxItemPrefab: Prefab = null;

    @property({type: Number, tooltip: '子节点行数'})
    private BoxItemRows: number = 0;
    @property({type: Number, tooltip: '子节点列数'})
    private BoxItemCols: number = 0;

    private buttonSpacing: number = 10; // 按钮之间的间隙

    xinNum: number = 0; // 小新总数（正常小新的总数 = 行列的最小值）

    doubleClickDelay: number = 300 // 双击判定时间

    private moveThresholdSq: number = 100 // 移动阈值平方

    // 按钮数据
    private buttonData: any[] = [];   // 数据数组，二维数组
    private buttonNodes: any[] = [];  // 生成的按钮节点（与数据索引对应）
    private buttonLabels: any[] = []; // 对应的 Label 组件

    // 触摸状态
    private touchStartPos: Vec2 = new Vec2(); // 触摸开始位置
    private hasMovedExceedThreshold: boolean = false; // 是否超出移动阈值
    private currentHoverButton: Node | null = null; // 当前悬停的按钮节点

    // 双击/单击状态
    private lastClickTime: number = 0; // 上次点击时间
    private lastClickButton: Node | null = null; // 上次点击的按钮节点
    private clickTimer: any = null; // 单击计时器
    private isWaitingForDoubleClick: boolean = false; // 是否等待双击

    // 节点到行列的映射（用于快速查找）
    private nodeToPosMap: Map<Node, { row: number, col: number }> = new Map();

    onLoad() {
        this.xinNum = Math.min(this.BoxItemRows, this.BoxItemCols); // 小新总数为行列的最小值
        // 初始化按钮数据
        this.initButtonData();
        // 生成按钮节点
        this.generateButtons();
        // 注册事件
        this.registerEvents();
    }

    onDestroy() {
        this.unregisterEvents();
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
        }
    }

    // 初始化按钮数据
    private initButtonData() {
        for (let row = 0; row < this.BoxItemRows; row++) {
            this.buttonData[row] = [];
            for (let col = 0; col < this.BoxItemCols; col++) {
                this.buttonData[row][col] = {
                    row: row,
                    col: col,
                    status: 0, // 0表示未翻转，1表示标记为单击，2表示标记为双击
                    isXin: false, // 是否存在小新
                    color: '' // 按钮颜色
                }
            }
        }
        // 把小新随机插入到数据中
        // 规则是：
        // a、每行、每列只能有一个小新
        // b、某个小新不能与它一个小新的周围不能再有小新
        // 方法就是，从第一行开始，随机选择一个列插入小新，然后在下一行随机选择一个列插入小新，但要保证不与前一个小新相邻（即不能是前一个小新的列、前一个小新的列-1、前一个小新的列+1）

        // 1、随机拿到小新数量的颜色
        const colors = colorGroup.sort(() => Math.random() - 0.5).slice(0, this.xinNum);
        // 2、随机小新
        let lastCol = -1;
        const colArr: any = [] // 存储小新所在列的索引，因为同一列不能有多个小新
        for (let i = 0; i < this.xinNum; i++) {
            let radomCol = 0
            // 是否有前一个小新
            if (lastCol >= 0) {
                // 如果有的话，再随机选择一个列，但要保证不能与前一个小新相邻
                // 拿到所有列的索引，排除前一个小新的列、前一个小新的列-1、前一个小新的列+1
                const lengArr = Array.from({length: this.BoxItemCols}, (_, j) => j); // 生成列索引数组 [0, 1, 2, ..., BoxItemCols - 1]
                const excludeCols: any = [lastCol, lastCol - 1, lastCol + 1];
                // 过滤掉排除的列
                const validCols = lengArr.filter(col => !([...excludeCols, ...colArr] as any).includes(col));
                const index = Math.floor(Math.random() * validCols.length);
                radomCol = validCols[index];
            } else {
                radomCol = Math.floor(Math.random() * this.BoxItemCols);
            }
            lastCol = radomCol;
            colArr.push(radomCol);
            console.log(`小新位置：${i}行${radomCol}列`);
            this.buttonData[i][radomCol].isXin = true;
            this.buttonData[i][radomCol].color = colors[i];
        }
        // 接下来处理没有小新的节点背景色
        // 规则：每个小新节点的颜色会随机向四周扩散，扩散规则是：小新的颜色会随机扩散到上下左右四个方向的第一个没有小新的节点上，如果该节点已经有颜色了，则不再扩散。
        //      并且每个小新的扩散个数是（1 - 剩余空白节点数）
        //      最后一个小新则不需要随机渲染，直接把剩余的空白节点都渲染成最后一个小新的颜色就行了
        const xinDatas = this.getXinDatas();
        let remainBlankNum = this.BoxItemRows * this.BoxItemCols - this.xinNum;
        if (xinDatas.length > 0) {
            for (let i = 0; i < xinDatas.length; i++) {
                const xin = xinDatas[i];
                // 小新的颜色
                const xinColor = xin.color;
                // 小新的位置
                const xinRow = xin.row;
                const xinCol = xin.col;
                // 如果是最后一个节点，则直接把剩余的空白节点都渲染成最后一个小新的颜色就行了
                if (i === xinDatas.length - 1) {
                    for (let row = 0; row < this.BoxItemRows; row++) {
                        for (let col = 0; col < this.BoxItemCols; col++) {
                            if (!this.buttonData[row][col].isXin && !this.buttonData[row][col].color) {
                                this.buttonData[row][col].color = xinColor;
                            }
                        }
                    }
                    break;
                }
                // 拿到当前小新需要扩散的随机空白节点数
                const spreadNum = Math.floor(Math.random() * remainBlankNum);
                remainBlankNum -= spreadNum;
                // 渲染空白节点的颜色
                let currSpreadRow = xinRow;
                let currSpreadCol = xinCol;
                for (let i = 0; i < spreadNum; i++) {
                    // 拿到上下左右四个方向的节点
                    const upNode = currSpreadRow > 0 ? this.buttonData[currSpreadRow - 1][currSpreadCol] : null;
                    const downNode = currSpreadRow < this.BoxItemRows - 1 ? this.buttonData[currSpreadRow + 1][currSpreadCol] : null;
                    const leftNode = currSpreadCol > 0 ? this.buttonData[currSpreadRow][currSpreadCol - 1] : null;
                    const rightNode = currSpreadCol < this.BoxItemCols - 1 ? this.buttonData[currSpreadRow][currSpreadCol + 1] : null;
                    const directions = [upNode, downNode, leftNode, rightNode].filter(node => node && !node.isXin && !node.color);
                    const index = Math.floor(Math.random() * directions.length);
                    const currentDirectionNode = directions[index];
                    if (currentDirectionNode) {
                        const { row, col } = currentDirectionNode;
                        this.buttonData[row][col].color = xinColor;
                        currSpreadRow = row;
                        currSpreadCol = col;
                    } else {
                        // 没有可以扩散的节点，结束循环
                        break;
                    }
                }
            }
        }
    }
    // 从二维数组中，找到所有的小新
    private getXinDatas() {
        const xinDatas = [];
        for (let row = 0; row < this.BoxItemRows; row++) {
            for (let col = 0; col < this.BoxItemCols; col++) {
                if (this.buttonData[row][col].isXin) {
                    xinDatas.push(this.buttonData[row][col]);
                }
            }
        }
        return xinDatas;
    }


    
    // 生成按钮节点
    private generateButtons() {
        const container = this.node;
        const containerTransform = container.getComponent(UITransform); // 获取容器的 UITransform 组件
        const containerWidth = containerTransform.width;
        const containerHeight = containerTransform.height;

        // 计算每个按钮的宽高（留一些内边距，例如左右上下各留 20px）
        const padding = 20;
        const availableWidth = containerWidth - padding * 2;
        const availableHeight = containerHeight - padding * 2;

        const btnWidth = (availableWidth - (this.buttonSpacing * (this.BoxItemCols - 1))) / this.BoxItemCols;
        const btnHeight = (availableHeight - (this.buttonSpacing * (this.BoxItemRows - 1))) / this.BoxItemRows;

        // 起始点坐标（左下角为原点，计算时需转换到中心锚点）
        const startX = -containerWidth / 2 + padding + btnWidth / 2;
        const startY = containerHeight / 2 - padding - btnHeight / 2;

        for (let row = 0; row < this.BoxItemRows; row++) {
            this.buttonNodes[row] = [];
            this.buttonLabels[row] = [];
            for (let col = 0; col < this.BoxItemCols; col++) {
                const btnNode = instantiate(this.BoxItemPrefab);
                btnNode.parent = container;

                // 设置位置
                const x = startX + col * (btnWidth + this.buttonSpacing);
                const y = startY - row * (btnHeight + this.buttonSpacing);
                btnNode.setPosition(x, y, 0);

                // 设置尺寸
                const btnTransform = btnNode.getComponent(UITransform);
                if (btnTransform) {
                    btnTransform.setContentSize(btnWidth, btnHeight);
                }

                // 设置颜色
                const btnSprite = btnNode.getComponent(Sprite);
                if (btnSprite) {
                    btnSprite.color = new Color(this.buttonData[row][col].color);
                }

                // 获取 Label 并更新文本
                const label = btnNode.getComponentInChildren(Label);
                label.string = this.buttonData[row][col].isXin ? 'X' : this.buttonData[row][col].status.toString();

                // 保存 Label节点 和 按钮节点
                this.buttonLabels[row][col] = label;
                this.buttonNodes[row][col] = btnNode;

                // 存储节点到行列的映射
                this.nodeToPosMap.set(btnNode, { row: row, col: col });
            }
        }
    }

    // ---------- 辅助：根据世界坐标查找按钮节点 ----------
    private getButtonAtWorldPos(worldPos: Vec2): any {
        for (let row = 0; row < this.BoxItemRows; row++) {
            for (let col = 0; col < this.BoxItemCols; col++) {
                const btn = this.buttonNodes[row][col];
                // 跳过不存在的按钮
                if (!btn) continue;
                const uiTransform = btn.getComponent(UITransform);
                // 如果没有 UITransform 组件，无法进行坐标转换，跳过
                if (!uiTransform) continue;
                // 转换世界坐标到节点坐标
                const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(worldPos.x, worldPos.y, 0));
                const rect = uiTransform.getBoundingBox();
                // 判断 localPos 是否在按钮的矩形范围内
                if (
                    localPos.x >= -rect.width / 2 &&
                    localPos.x <= rect.width / 2 &&
                    localPos.y >= -rect.height / 2 &&
                    localPos.y <= rect.height / 2
                ) {
                    return btn;
                }
            }
        }
        return null;
    }

    // ---------- 更新按钮显示及数据状态 ----------
    private updateButtonStatus(row: number, col: number, newStatus: 0 | 1 | 2) {
        if (row < 0 || row >= this.BoxItemRows || col < 0 || col >= this.BoxItemCols) return;
        const data = this.buttonData[row][col];
        if (!data || data.status === newStatus) return;
        data.status = newStatus;
        const label = this.buttonLabels[row][col];
        if (label) {
            label.string = newStatus.toString();
        }
    }

    // 双击处理
    private onDoubleClick(btnNode: Node) {
        const pos = this.nodeToPosMap.get(btnNode);
        if (pos) {
            this.updateButtonStatus(pos.row, pos.col, 2);
        }
    }

    // 单击处理
    private onSingleClick(btnNode: Node) {
        const pos = this.nodeToPosMap.get(btnNode);
        if (pos) {
            const data = this.buttonData[pos.row][pos.col];
            if (data && data.status === 0) {
                this.updateButtonStatus(pos.row, pos.col, 1);
            }
        }
    }

    // 滑动经过处理
    private onHoverEnter(btnNode: Node) {
        const pos = this.nodeToPosMap.get(btnNode);
        if (pos) {
            const data = this.buttonData[pos.row][pos.col];
            if (data && data.status === 0) {
                this.updateButtonStatus(pos.row, pos.col, 1);
            }
        }
    }

    // 注册事件
    registerEvents() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }
    // 注销事件
    private unregisterEvents() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    // ---------- 触摸事件实现 ----------
    private onTouchStart(event: EventTouch) {
        const touchPos = event.getUILocation();
        this.touchStartPos.set(touchPos.x, touchPos.y);
        this.hasMovedExceedThreshold = false;

        const currentBtn = this.getButtonAtWorldPos(touchPos);
        if (!currentBtn) return;

        const now = Date.now();

        // 双击判定
        // 检查是否正在等待双击，且点击的按钮与上一次相同，且移动未超过阈值，且时间间隔在双击判定范围内
        if (
            this.isWaitingForDoubleClick &&
            this.lastClickButton === currentBtn &&
            (now - this.lastClickTime) < this.doubleClickDelay &&
            !this.hasMovedExceedThreshold
        ) {
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
                this.clickTimer = null;
            }
            this.isWaitingForDoubleClick = false;
            this.onDoubleClick(currentBtn);
            this.lastClickButton = null;
            this.lastClickTime = 0;
            return;
        }

        // 准备可能的单击
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
        }
        this.isWaitingForDoubleClick = true;
        this.lastClickButton = currentBtn;
        this.lastClickTime = now;

        this.clickTimer = setTimeout(() => {
            // 单击判定：如果仍在等待双击且未超过移动阈值，则执行单击逻辑
            if (this.isWaitingForDoubleClick && !this.hasMovedExceedThreshold) {
                this.onSingleClick(currentBtn);
            }
            this.isWaitingForDoubleClick = false;
            this.clickTimer = null;
        }, this.doubleClickDelay);
    }

    // 触摸移动
    private onTouchMove(event: EventTouch) {
        const touchPos = event.getUILocation();
        const currentBtn = this.getButtonAtWorldPos(new Vec2(touchPos.x, touchPos.y));

        // 检测移动是否超过阈值
        const dx = touchPos.x - this.touchStartPos.x;
        const dy = touchPos.y - this.touchStartPos.y;
        const distSq = dx * dx + dy * dy;
        if (!this.hasMovedExceedThreshold && distSq >= this.moveThresholdSq) {
            this.hasMovedExceedThreshold = true;
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
                this.clickTimer = null;
                this.isWaitingForDoubleClick = false;
                this.lastClickButton = null;
            }
        }

        // 滑动经过：进入新按钮区域时改变状态
        if (currentBtn && currentBtn !== this.currentHoverButton) {
            this.onHoverEnter(currentBtn);
            this.currentHoverButton = currentBtn;
        } else if (!currentBtn) {
            this.currentHoverButton = null;
        }
    }

    // 触摸结束
    private onTouchEnd(event: EventTouch) {
        // 检查是否移动超过阈值
        if (this.hasMovedExceedThreshold) {
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
                this.clickTimer = null;
            }
            this.isWaitingForDoubleClick = false;
            this.lastClickButton = null;
        }
        this.currentHoverButton = null;
    }

    // 触摸取消
    private onTouchCancel(event: EventTouch) {
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
        }
        this.isWaitingForDoubleClick = false;
        this.hasMovedExceedThreshold = false;
        this.lastClickButton = null;
        this.currentHoverButton = null;
    }
}


