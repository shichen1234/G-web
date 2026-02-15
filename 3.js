// 在 main.js 的 DOMContentLoaded 事件中更新
document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY_BIRTHDAY = 'user_birthday_date';
  const pickerSection = document.getElementById('birthdayPicker');
  const displaySection = document.getElementById('birthdayDisplay');
  const dateInput = document.getElementById('birthdayDateInput');
  const daysNumber = document.getElementById('daysNumber');
  const saveBtn = document.getElementById('saveBirthdayBtn');
  const resetBtn = document.getElementById('resetBirthdayBtn');

  // 计算剩余天数
// 修改后的 calculateDays 函数
function calculateDays(birthdayStr) {
  const today = new Date();
  // 【关键修复 1】：强制将当前时间设置为今天的凌晨 00:00:00.000
  today.setHours(0, 0, 0, 0);

  const parts = birthdayStr.split('-');
  const bMonth = parseInt(parts[1], 10) - 1;
  const bDay = parseInt(parts[2], 10);
  
  // 【关键修复 2】：强制将生日日期也设置为当天的凌晨 00:00:00.000
  let nextBirthday = new Date(today.getFullYear(), bMonth, bDay);
  nextBirthday.setHours(0, 0, 0, 0);

  // 如果今年的生日已经过了，算明年的
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const diffTime = nextBirthday - today;
  // 【关键修复 3】：使用 Math.round 或 Math.floor 确保结果是一个纯整数 0
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

  // 更新界面显示
  function updateUI() {
    const savedDate = localStorage.getItem(STORAGE_KEY_BIRTHDAY);
    if (savedDate) {
      const days = calculateDays(savedDate);
      daysNumber.textContent = days === 0 ? "今" : days;
      
      // 显示倒计时卡片
      pickerSection.style.display = 'none';
      displaySection.style.display = 'block';
      surpriseScreen.style.display = 'none'; // 确保惊喜屏默认隐藏

      // 如果是今天，显示惊喜入口
      if (days === 0) {
        surpriseLink.style.display = 'block';
        daysNumber.nextElementSibling.textContent = "天";
      } else {
        surpriseLink.style.display = 'none';
      }
    } else {
      pickerSection.style.display = 'block';
      displaySection.style.display = 'none';
      surpriseScreen.style.display = 'none';
    }
  }
  // 保存生日
  saveBtn.addEventListener('click', () => {
    const dateVal = dateInput.value;
    if (!dateVal) {
      alert("请选择日期喵~");
      return;
    }
    localStorage.setItem(STORAGE_KEY_BIRTHDAY, dateVal);
    updateUI();
    // 使用现有的 showBubble 函数反馈
    if (typeof showBubble === 'function') {
      showBubble("已经记下你的生日啦喵！✨");
    }
  });
  

  // 重置生日
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY_BIRTHDAY);
    updateUI();
  });

  // 初始化加载
  updateUI();
  // 更新UI的函数
  // 点击“去看看”
  document.getElementById('goSurprise').addEventListener('click', () => {
    // 1. 切换显示区域
    displaySection.style.display = 'none';
    surpriseScreen.style.display = 'block';
    
    // 2. 小猫弹出祝福（假设你已有名为 showBubble 的函数）
    if (typeof showBubble === 'function') {
      showBubble("✨ 哇！祝你生日快乐喵！快看我为你准备的蛋糕~ 🎂");
    }
  });

  // 点击“返回”
  document.getElementById('backFromSurprise').addEventListener('click', () => {
    updateUI();
  });

  // 其余代码保持不变 (calculateDays, saveBtn, resetBtn 等)
  // ... (见上一条回复的逻辑)
});
// ======================================================
// 📝 备忘录逻辑 (已升级：拖拽排序 + FLIP 丝滑动画)
// ======================================================
const todoInput = document.getElementById('todoInput');
if (todoInput) {
  todoInput.addEventListener('keydown', (e) => {
    // 当按下空格键时，阻止事件冒泡到全局 document
    if (e.key === ' '|| e.code === 'Space') {
      e.stopPropagation(); 
    }
  });
}
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');
const TODO_KEY = 'user_todos';

// 全局变量：记录正在拖拽的备忘录条目
let dragSrcTodo = null;

// 加载所有任务
function loadTodos() {
  const todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
  todoList.innerHTML = ''; 
  todos.forEach((todo) => {
    // 💡 注意：这里不再传递 index，而是依赖动态计算
    createTodoElement(todo.text, todo.done);
  });
}

function createTodoElement(text, done) {
  const li = document.createElement('li');
  if (done) li.classList.add('done');

  // 🔥 开启拖拽 🔥
  li.draggable = true;

  // --- 1. 拖拽开始 ---
  li.addEventListener('dragstart', function(e) {
    e.stopPropagation(); // 🟢【核心修复】阻止事件冒泡！防止被父容器拦截或触发父容器拖动
    
    dragSrcTodo = this;
    e.dataTransfer.effectAllowed = 'move';
    // 延迟添加样式，让“幽灵”图保持原样，本体变半透明
    setTimeout(() => this.classList.add('dragging'), 0);
  });

  // --- 2. 拖拽结束 ---
  li.addEventListener('dragend', function(e) {
    e.stopPropagation(); // 建议结束时也阻止一下，虽非必须但更安全
    this.classList.remove('dragging');
    dragSrcTodo = null;
    
    // 保存新顺序到本地存储
    saveTodoOrder(); 
    
    // 清理所有动画残留样式
    Array.from(todoList.children).forEach(child => {
      child.style.transition = '';
      child.style.transform = '';
    });
  })
  // --- 3. 拖拽经过 (核心排序 + 动画) ---
  li.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (this === dragSrcTodo) return;

    const container = todoList;
    
    // First: 记录所有兄弟元素的位置
    const siblings = Array.from(container.children).filter(c => c !== dragSrcTodo);
    const positions = new Map();
    siblings.forEach(el => positions.set(el, el.getBoundingClientRect()));

    // 计算插入位置
    const rect = this.getBoundingClientRect();
    const offset = e.clientY - rect.top - rect.height / 2;
    let hasMoved = false;

    if (offset < 0) {
      // 插在前面
      if (this.previousElementSibling !== dragSrcTodo) {
        container.insertBefore(dragSrcTodo, this);
        hasMoved = true;
      }
    } else {
      // 插在后面
      if (this.nextElementSibling !== dragSrcTodo) {
        container.insertBefore(dragSrcTodo, this.nextSibling);
        hasMoved = true;
      }
    }

    if (!hasMoved) return;

    // Last & Invert & Play: 执行动画
    siblings.forEach(el => {
      const oldPos = positions.get(el);
      const newPos = el.getBoundingClientRect();
      
      // 只有位置变了才做动画
      if (oldPos.top !== newPos.top) {
        const deltaY = oldPos.top - newPos.top;
        
        // 瞬间移回旧位置
        el.style.transition = 'none';
        el.style.transform = `translateY(${deltaY}px)`;

        // 下一帧滑向新位置
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)';
            el.style.transform = '';
          });
        });
      }
    });
  });

  // --- 内部内容 ---
  
  // 文本部分
  const span = document.createElement('span');
  span.textContent = text;
  span.style.cssText = "cursor:pointer; flex:1;";
  
  // 点击文字：切换状态
  span.addEventListener('click', (e) => {
    e.stopPropagation();
    // 💡 动态获取当前索引（因为拖拽后索引会变）
    const currentIdx = Array.from(todoList.children).indexOf(li);
    toggleTodo(currentIdx);
  });

  // 删除按钮
  const btn = document.createElement('button');
  btn.className = 'del-todo-btn';
  btn.textContent = '×';
  
  // 点击删除
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    const currentIdx = Array.from(todoList.children).indexOf(li);
    deleteTodo(currentIdx);
  });

  li.appendChild(span);
  li.appendChild(btn);
  todoList.appendChild(li);
}

// 🔥 新增：保存当前 DOM 顺序到 localStorage
function saveTodoOrder() {
  const todos = [];
  // 遍历当前的 DOM 列表顺序
  Array.from(todoList.children).forEach(li => {
    const text = li.querySelector('span').textContent;
    const done = li.classList.contains('done');
    todos.push({ text, done });
  });
  localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}

// 添加任务
function handleAddTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  
  const todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
  todos.push({ text: text, done: false });
  localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  
  todoInput.value = '';
  loadTodos(); // 重新加载以显示新任务
  
  if (typeof showBubble === 'function') {
    const msgs = ["收到！记下来了喵~", "好记性不如烂笔头喵！", "加油完成哦喵~"];
    showBubble(msgs[Math.floor(Math.random() * msgs.length)]);
  }
}

function deleteTodo(index) {
  const items = document.querySelectorAll('#todoList li');
  if (items[index]) {
    // 1. 先加动画类
    items[index].classList.add('deleting-item');

    // 2. 等动画播完再真正删除数据
    setTimeout(() => {
      const todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
      todos.splice(index, 1);
      localStorage.setItem(TODO_KEY, JSON.stringify(todos));
      loadTodos(); // 重新渲染
    }, 300); // 300ms 对应 CSS 动画时间
  }
}

// 切换完成状态 (按索引)
function toggleTodo(index) {
  const todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
  if (index >= 0 && index < todos.length) {
    todos[index].done = !todos[index].done;
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    loadTodos();
    
    if (todos[index].done && typeof showBubble === 'function') {
      showBubble("太棒了！又完成一件事喵！🎉");
    }
  }
}

// 事件绑定
if (addTodoBtn) {
  addTodoBtn.addEventListener('click', handleAddTodo);
}

if (todoInput) {
  todoInput.addEventListener('keydown', (e) => { 
    if(e.key === 'Enter') handleAddTodo(); 
  });
}

// 初始化
if (todoList) {
  loadTodos();
}
// === 计算器逻辑 (优化版) ===
// === 计算器逻辑 (扩展程序兼容版) ===
document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('calcDisplay');
  const buttons = document.querySelectorAll('.calc-btn');
  
  if(!display) return;
// 👇👇👇 新增：更严谨的输入过滤（包含中文输入法拦截） 👇👇👇
  
  // 1. 移除只读属性
  display.removeAttribute('readonly'); 

  // 标记是否正在使用输入法
  let isComposing = false;

  // 监听输入法开始（比如打拼音时）
  display.addEventListener('compositionstart', () => {
    isComposing = true;
  });

  // 监听输入法结束（选词上屏时）
  display.addEventListener('compositionend', (e) => {
    isComposing = false;
    // 上屏瞬间立即清洗，防止中文残留
    filterInput(e.target);
  });

  // 监听最终输入事件（处理所有输入情况，包括粘贴、拖拽、普通打字）
  display.addEventListener('input', (e) => {
    // 如果正在打拼音过程中，先不处理，等上屏后再处理
    if (isComposing) return;
    filterInput(e.target);
  });

  // 核心清洗函数：只保留数字和运算符
  function filterInput(inputElement) {
    // 正则表达式：保留数字、小数点、加减乘除、括号
    // [^0-9+\-*/.()] 意思是：除了这些字符以外的所有字符
    const originalValue = inputElement.value;
    const cleanValue = originalValue.replace(/[^0-9+\-*/.()]/g, '');
    
    if (originalValue !== cleanValue) {
      inputElement.value = cleanValue;
    }
  }

  // 监听按键（处理回车计算和快捷键）
  display.addEventListener('keydown', (e) => {
    // [Enter] 键 -> 触发计算
    if (e.key === 'Enter') {
      e.preventDefault();
      const eqBtn = document.querySelector('.calc-btn[data-val="="]');
      if (eqBtn) eqBtn.click();
    }
    // [Escape] 键 -> 清空
    else if (e.key === 'Escape') {
      e.preventDefault();
      display.value = '';
    }
  });

  // 👆👆👆 新增代码结束 👆👆👆
  // ★ 新增：安全的计算函数（不使用 eval）
  function safeCalculate(expression) {
    // 1. 移除末尾悬空的符号
    const ops = ['+', '-', '*', '/', '.'];
    while (ops.includes(expression.slice(-1))) {
      expression = expression.slice(0, -1);
    }
    if (!expression) return "";

    // 2. 解析字符串为数组： "10-2*3" -> ["10", "-", "2", "*", "3"]
    let tokens = expression.split(/([\+\-\*\/])/).map(t => t.trim()).filter(t => t !== "");

    // 3. 处理开头的负数 (例如 "-5+3")
    if (tokens[0] === '-' && !isNaN(tokens[1])) {
       tokens[1] = '-' + tokens[1]; // 组合成 "-5"
       tokens.shift(); // 移除独立的 "-"
    }

    // 4. 第一轮：先算乘除 (* /)
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === '*' || tokens[i] === '/') {
        let left = parseFloat(tokens[i - 1]);
        let right = parseFloat(tokens[i + 1]);
        let res = (tokens[i] === '*') ? (left * right) : (left / right);
        // 用结果替换掉 "左 操作符 右" 这三项
        tokens.splice(i - 1, 3, res);
        i--; // 索引回退，继续检查
      }
    }

    // 5. 第二轮：再算加减 (+ -)
    let result = parseFloat(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
      let op = tokens[i];
      let num = parseFloat(tokens[i + 1]);
      if (op === '+') result += num;
      if (op === '-') result -= num;
    }

    return isNaN(result) ? "Error" : result;
  }

  // 按钮点击监听
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');
      let current = display.value; 
      const ops = ['+', '-', '*', '/', '.'];

      // 1. 清除 (C)
      if (val === 'C') {
        display.value = '';
      } 
      // 2. 删除 (DEL)
      else if (val === 'DEL') {
        if (current === 'Error' || current === 'Infinity' || current === 'NaN') {
          display.value = '';
        } else {
          display.value = current.slice(0, -1);
        }
      } 
      // 3. 计算 (=)
      else if (val === '=') {
        try {
          if (!current) return;
          
          // ★ 使用我们写的 safeCalculate 代替 eval
          let result = safeCalculate(current);
          
          // 处理精度 (如 0.1+0.2)
          if (typeof result === 'number' && !Number.isInteger(result)) {
            result = parseFloat(result.toFixed(6));
          }
          
          display.value = result;

          // 小猫互动
          if(typeof showBubble === 'function' && result !== 'Error' && Math.random() > 0.8) {
             showBubble("算数我在行喵！");
          }
        } catch (e) {
          console.error(e);
          display.value = 'Error';
          if(typeof showBubble === 'function') showBubble("算式太难了喵...");
        }
      } 
      // 4. 输入处理
      else {
        if (display.value === 'Error') {
            display.value = '';
            current = '';
        }

        const lastChar = current.slice(-1);

        // 符号替换逻辑 (例如输入 5+ 后点 -, 变成 5-)
        if (ops.includes(lastChar) && ops.includes(val)) {
           display.value = current.slice(0, -1) + val;
           return;
        }
        
        // 防止多个小数点
        if (val === '.') {
           const parts = current.split(/[\+\-\*\/]/);
           const currentNum = parts[parts.length - 1];
           if (currentNum.includes('.')) return;
        }

        display.value += val;
      }
    });
  });
});
// === 🐍 贪吃蛇游戏逻辑 (Widget版 - 指令队列优化版) ===
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('snakeCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const highScoreEl = document.getElementById('snakeHighScore');
  const currentScoreEl = document.getElementById('currentSnakeScore'); 
  
  const gridSize = 15; 
  const tileCountX = canvas.width / gridSize; 
  const tileCountY = canvas.height / gridSize; 
  
  let score = 0;
  let highScore = parseInt(localStorage.getItem('snakeHighScore') || '0');
  highScoreEl.textContent = highScore;

  let snake = [];
  let velocity = { x: 0, y: 0 };
  let food = { x: 5, y: 5 };
  
  let isPlaying = false;
  let isGameOver = false; 
  let gameInterval = null;
  
  // ✨【优化核心 1】使用队列代替布尔锁
  // 这里用来存储玩家预输入的指令
  let moveQueue = [];

  let baseSpeed = 200; 
  let currentSpeed = baseSpeed;

  function initGame() {
    snake = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 }
    ];
    velocity = { x: 1, y: 0 }; 
    score = 0;
    currentScoreEl.textContent = 0; 
    currentSpeed = baseSpeed;
    
    isGameOver = false;
    isPlaying = true;
    moveQueue = []; // 清空指令队列
    
    spawnFood();
    
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, currentSpeed);
  }

  function spawnFood() {
    let valid = false;
    while (!valid) {
      food.x = Math.floor(Math.random() * tileCountX);
      food.y = Math.floor(Math.random() * tileCountY);
      valid = true;
      for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
          valid = false;
          break;
        }
      }
    }
  }
function gameLoop() {
    // ✅ 新增检查：如果面板是收起的，直接暂停循环，不占用 CPU
    const rightPanel = document.getElementById('quickPanelright');
    if (rightPanel && rightPanel.classList.contains('collapsedright')) {
        return; // 停止这一帧的计算
    }

    update();
    draw(); 
}

  function update() {
    if (isGameOver || !isPlaying) return;

    // ✨【优化核心 2】从队列中取出下一个指令执行
    if (moveQueue.length > 0) {
        // 取出队列里的第一个指令赋值给速度
        velocity = moveQueue.shift();
    }

    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    // 1. 撞墙检测
    if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
      triggerGameOver();
      return;
    }

    // 2. 撞自己检测
    for (let part of snake) {
      if (head.x === part.x && head.y === part.y) {
        triggerGameOver();
        return;
      }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      currentScoreEl.textContent = score; 
      spawnFood();
      
      if (score % 5 === 0 && currentSpeed > 100) {
        clearInterval(gameInterval);
        currentSpeed -= 5; 
        gameInterval = setInterval(gameLoop, currentSpeed);
      }
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制食物
    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.arc(
      food.x * gridSize + gridSize/2, 
      food.y * gridSize + gridSize/2, 
      gridSize/2 - 2, 0, Math.PI * 2
    );
    ctx.fill();

    // 绘制蛇
    snake.forEach((part, index) => {
      ctx.fillStyle = index === 0 ? '#69f0ae' : '#00e676';
      ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
      
      if (index === 0) {
        ctx.fillStyle = '#333';
        ctx.fillRect(part.x * gridSize + 4, part.y * gridSize + 4, 2, 2);
        ctx.fillRect(part.x * gridSize + 10, part.y * gridSize + 4, 2, 2);
      }
    });

    if (isGameOver) {
      drawGameOverScreen();
    }
  }

  function triggerGameOver() {
    isGameOver = true;
    isPlaying = false;
    clearInterval(gameInterval); 
    draw(); 
    
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snakeHighScore', highScore);
      highScoreEl.textContent = highScore;
    }
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff5252'; 
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText("💔 游戏结束", canvas.width / 2, canvas.height / 2 - 15);

    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText("点击任意处 再来一次", canvas.width / 2, canvas.height / 2 + 25);
  }

  function drawStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("🐍 点击开始游戏", canvas.width / 2, canvas.height / 2 - 10);
    
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText("使用 WASD 或 方向键 控制", canvas.width / 2, canvas.height / 2 + 20);
  }

  // 🎮 键盘控制 (队列版)
  document.addEventListener('keydown', (e) => {
    const panel = document.getElementById('quickPanelright');
    if (panel && panel.classList.contains('collapsedright')) return;

    const keys = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyS","KeyA","KeyD","Space"];
    if(keys.indexOf(e.code) > -1) e.preventDefault();

    if (e.code === 'Space') {
      if (!isPlaying) initGame();
      return;
    }

    if (!isPlaying) return;

    // ✨【优化核心 3】智能存入队列
    // 限制队列长度为 2，防止玩家瞎按导致蛇“延迟”很久才动
    if (moveQueue.length >= 2) return;

    // 确定“当前参考速度”：
    // 如果队列里已经有指令，我们应该基于队列里最后一个指令来判断是否反向
    // 如果队列是空的，就基于当前蛇的真实速度
    const lastMove = moveQueue.length > 0 ? moveQueue[moveQueue.length - 1] : velocity;

    let nextMove = null;

    switch(e.code) {
      case 'ArrowLeft': 
      case 'KeyA': 
        if (lastMove.x !== 1) nextMove = { x: -1, y: 0 }; 
        break;
      case 'ArrowUp':   
      case 'KeyW': 
        if (lastMove.y !== 1) nextMove = { x: 0, y: -1 }; 
        break;
      case 'ArrowRight':
      case 'KeyD': 
        if (lastMove.x !== -1) nextMove = { x: 1, y: 0 }; 
        break;
      case 'ArrowDown': 
      case 'KeyS': 
        if (lastMove.y !== -1) nextMove = { x: 0, y: 1 }; 
        break;
    }

    // 如果按键有效，推入队列
    if (nextMove) {
        // 防止重复输入相同方向
        if (lastMove.x === nextMove.x && lastMove.y === nextMove.y) return;
        moveQueue.push(nextMove);
    }
  });

  canvas.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isPlaying) {
      initGame();
    }
  });

  drawStartScreen();
});
// === 🗓️ 迷你日历逻辑 (农历增强版) ===
document.addEventListener('DOMContentLoaded', () => {
  const monthYearEl = document.getElementById('calMonthYear');
  const gridEl = document.getElementById('calGrid');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  const toTodayBtn = document.getElementById('toToday'); 
if (toTodayBtn) {
  toTodayBtn.addEventListener('click', () => {
    // 1. 将 currentDate 重置为当前真实时间
    currentDate = new Date(); 
    // 2. 重新渲染日历
    renderCalendar(currentDate);
    if (typeof showBubble === 'function') {
      showBubble("回到今天啦喵～📅");
    }
  });
}
  if(!gridEl) return;

  let currentDate = new Date();

  function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth(); 
    
    monthYearEl.textContent = `${year}年 ${month + 1}月`;
    gridEl.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay(); // 当月第一天星期几
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // 当月总天数
    const today = new Date();

    // 填充空白
    for(let i = 0; i < firstDay; i++) {
      gridEl.appendChild(document.createElement('div'));
    }

    // 填充日期
    for(let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      
      // --- 核心改动：计算农历和节日 ---
      // 创建当前日期的对象
      const currentLoopDate = new Date(year, month, d);
      let lunarText = '';
      let isFestival = false;

      // 只有当 Lunar 库加载成功时才计算，防止报错
      if (window.Lunar && window.Solar) {
        const solar = Solar.fromDate(currentLoopDate);
        const lunar = Lunar.fromDate(currentLoopDate);

        // 1. 获取农历基础日期 (初一、十五等)
        let dayStr = lunar.getDayInChinese();
        if (dayStr === '初一') dayStr = lunar.getMonthInChinese() + '月';

        // 2. 获取节气 (清明、冬至等)
        const jieqi = lunar.getJieQi();

        // 3. 获取节日 (优先显示)
        // 获取公历节日 (如元旦、国庆)
        const solarFestivals = solar.getFestivals();
        // 获取农历节日 (如春节、中秋)
        const lunarFestivals = lunar.getFestivals();

        // 优先级逻辑：节日 > 节气 > 农历初一 > 普通农历
        if (lunarFestivals.length > 0) {
          lunarText = lunarFestivals[0];
          isFestival = true;
          // 修正：如果遇到“春节”，显示这两个字
          // 显示完整节日名称（不再限制长度） 
        } else if (solarFestivals.length > 0) {
          lunarText = solarFestivals[0];
          isFestival = true;
           // 显示完整节日名称（不再限制长度）
        } else if (jieqi) {
          lunarText = jieqi;
          isFestival = true; // 节气也高亮
        } else {
          lunarText = dayStr;
        }
      } else {
        lunarText = '...'; // 库没加载出来的兜底
      }

      // --- 构建 HTML ---
      cell.className = isFestival ? 'is-festival' : '';
      cell.innerHTML = `
        <span class="solar-text">${d}</span>
        <span class="lunar-text">${lunarText}</span>
      `;
      
      // 样式处理
      cell.style.borderRadius = '6px';
      cell.style.cursor = 'default';
      
      // 高亮今天
      if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d) {
        cell.style.background = '#0b74de';
        cell.style.color = 'white'; // 强制文字变白
        cell.style.fontWeight = 'bold';
        cell.style.boxShadow = '0 2px 8px rgba(11, 116, 222, 0.4)';
        // 去掉节日红，避免在蓝色背景上看不清
        cell.classList.remove('is-festival'); 
      } else {
        cell.addEventListener('mouseenter', () => cell.style.background = 'rgba(255,255,255,0.1)');
        cell.addEventListener('mouseleave', () => {
             if(!(today.getFullYear() === year && today.getMonth() === month && today.getDate() === d)) 
                 cell.style.background = 'transparent'; 
        });
      }
      gridEl.appendChild(cell);
    }
  }
  renderCalendar(currentDate);

  prevBtn.addEventListener('click', () => {
    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  });
  
  nextBtn.addEventListener('click', () => {
    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  });
});
// === ⌨️ 搜索框打字机效果 (最终修正版) ===
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  
  // 1. 趣味提示词 (打字机循环播放的内容)
 const funPhrases = [
    "搜索感兴趣的内容...",
    "今天天气怎么样？",
    "中午吃点什么好呢？",
    "最近有什么好听的歌？",
    "查查今天的热点新闻",
    "周末去哪里玩？",
    "生活小常识",
    "保持好奇心..."
  ];

  // 2. 引擎默认提示词 (用于点击时恢复显示)
  // ⚠️ 注意：这里的顺序必须和你上面 engines 数组的顺序完全一致！
  const enginePlaceholders = [
    "通过bing搜索...",   // 对应 index 0 (Bing)
    "Google 搜索...",    // 对应 index 1 (Google)
    "百度一下...",       // 对应 index 2 (百度)
    "搜狗搜索..."        // 对应 index 3 (搜狗)
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 100;
  let deleteSpeed = 50;
  let pauseTime = 1700;
  let timer = null;
  let isFocused = false; 

  function typeEffect() {
    if (timer) clearTimeout(timer);
    // 如果用户正在输入，强制停止动画
    if (isFocused) return;

    const currentPhrase = funPhrases[phraseIndex];

    if (isDeleting) {
      input.setAttribute('placeholder', currentPhrase.substring(0, charIndex - 1));
      charIndex--;
      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % funPhrases.length;
        timer = setTimeout(typeEffect, 1000);
      } else {
        timer = setTimeout(typeEffect, deleteSpeed);
      }
    } else {
      input.setAttribute('placeholder', currentPhrase.substring(0, charIndex + 1));
      charIndex++;
      if (charIndex === currentPhrase.length) {
        isDeleting = true;
        timer = setTimeout(typeEffect, pauseTime);
      } else {
        timer = setTimeout(typeEffect, typeSpeed);
      }
    }
  }
// 定义一个全局变量用于存储 AI 模式的打字定时器，防止冲突
  let aiTypingTimer = null;

  // 1. 获得焦点
  input.addEventListener('focus', () => {
    isFocused = true;
    clearTimeout(timer); // 停止原有“趣味提示词”的打字机

    // 实时读取当前的 AI 模式状态
    const isAiActive = localStorage.getItem("isAiMode") === "true";
    
    if (isAiActive) {
      // === ✨ AI 模式打字机逻辑 (打完不消失) ===
      if (aiTypingTimer) clearTimeout(aiTypingTimer);
      
      const aiText = "向豆包提问...";
      let i = 0;
      input.setAttribute('placeholder', ''); // 先清空

      function playAiTyping() {
        // 如果已经失去焦点，停止打字
        if (!isFocused) return;

        if (i < aiText.length) {
          // 逐字增加
          input.setAttribute('placeholder', aiText.substring(0, i + 1));
          i++;
          // 设置打字速度 (100ms)
          aiTypingTimer = setTimeout(playAiTyping, 100);
        } else {
          // 打完字后，什么都不做，让字停留在那里（不消失）
          // 也不启动 isDeleting 逻辑
        }
      }
      // 开始播放
      playAiTyping();

    } else {
      // === 普通模式逻辑 (直接显示对应引擎提示) ===
      let currentIdx = parseInt(localStorage.getItem("currentEngine") || "0", 10);
      input.setAttribute('placeholder', enginePlaceholders[currentIdx]);
    }
  });

  // 2. 失去焦点（用户点到别处）
  input.addEventListener('blur', () => {
    // 只有输入框为空时，才恢复打字机
    if (input.value.trim() === '') {
      isFocused = false;
      isDeleting = false; 
      charIndex = 0;
      typeEffect(); 
    }
  });

  // 启动动画
  typeEffect();
});
// === 🖱️ 鼠标粒子拖尾系统 (极致性能优化版：自动休眠 + 0%闲置CPU) ===

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('mouse-trail');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  let particles = [];
  let linePoints = [];
  let mouse = { x: -100, y: -100 };
  let trailStyle = localStorage.getItem('trailStyle') || 'particle';
  
  // ⚡️ 核心优化变量：控制动画循环的开关
  let animationId = null;
  let isPaused = false; 

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // --- ✨ 优化：对象池 (Object Pooling) ---
  function createObjectPool(ObjectClass, initialSize = 150) {
    const pool = [];
    for (let i = 0; i < initialSize; i++) {
      pool.push(new ObjectClass());
    }
    return {
      get: function() {
        return pool.length > 0 ? pool.pop() : new ObjectClass();
      },
      release: function(obj) {
        pool.push(obj);
      }
    };
  }

  // --- 1. 光球粒子 ---
  class Particle {
    constructor() {
      this.color = 'rgba(255, 255, 255, 0.4)';
      this.shrink = 0.05; 
    }
    reset(x, y) {
      this.x = x; this.y = y;
      this.size = Math.random() * 8 + 5;
      this.speedX = Math.random() * 0.6 - 0.3;
      this.speedY = Math.random() * 0.6 - 0.3;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.size -= this.shrink;
      if (this.size < 0) this.size = 0;
    }
    draw() {
      if (this.size <= 0) return;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 2. 星尘粒子 ---
  class Sparkle {
      constructor() {
        this._colors = ['255, 235, 59', '255, 255, 255', '100, 255, 255', '255, 100, 255'];
      }
      reset(x, y) {
        this.x = x; this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.baseColor = this._colors[Math.floor(Math.random() * this._colors.length)];
        this.size = Math.random() * 8 + 4;
        this.life = 1.0;
        this.decay = Math.random() * 0.015 + 0.01;
        this.rotation = Math.random() * Math.PI;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.92; this.vy *= 0.92;
        this.vy += 0.05;
        this.rotation += this.rotSpeed;
        this.life -= this.decay;
        if (this.life < 0.5) this.size *= 0.95;
      }
      draw() {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = `rgba(${this.baseColor}, ${this.life})`;
        const s = this.size, k = s * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(k, -k); ctx.lineTo(s, 0); ctx.lineTo(k, k);
        ctx.lineTo(0, s); ctx.lineTo(-k, k); ctx.lineTo(-s, 0); ctx.lineTo(-k, -k);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
  }

  const particlePool = createObjectPool(Particle, 200);
  const sparklePool = createObjectPool(Sparkle, 200);

  // --- 3. 核心：对外控制接口 (供 main.js 休眠逻辑调用) ---
  window.pauseMouseTrail = function() {
    isPaused = true;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 暂停时清空一次，防止残影
    }
  };

  window.resumeMouseTrail = function() {
    isPaused = false;
    // 不立即启动，等鼠标动了再说，节省资源
  };

  // --- 4. 鼠标移动事件 (唤醒器) ---
  window.addEventListener('mousemove', (e) => {
    // 如果全局暂停，或者特效关闭，直接忽略
    if (isPaused || trailStyle === 'off') return;

    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    // ⚡️ 核心优化：如果循环已停止（animationId 为空），则唤醒它
    if (!animationId) {
        animate();
    }

    // 生成新粒子逻辑
    if (trailStyle === 'particle') {
       const p = particlePool.get();
       if (p) { p.reset(mouse.x, mouse.y); particles.push(p); }
    } else if (trailStyle === 'sparkle') {
       const s = sparklePool.get();
       if(s){ s.reset(mouse.x, mouse.y); particles.push(s); }
    }
  }); 

  // --- 5. 核心动画循环 (自动休眠版) ---
  function animate() {
    // 🛑 检查退出条件 1: 全局暂停或特效关闭
    if (isPaused || trailStyle === 'off') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animationId = null; // 标记循环已死
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let hasActivity = false; // 标记这一帧是否画了东西

    // === 🌈 彩虹线条 ===
    if (trailStyle === 'line') {
      // 只有在鼠标移动时才添加点（通过 mousemove 触发，这里只负责更新）
      // 注意：这里需要配合 mousemove 里的逻辑，linePoints 的添加其实应该在 mousemove 里做更佳，但为了兼容旧逻辑：
      // 我们在循环里检查鼠标是否产生新位置有点麻烦，这里简化为：只处理寿命衰减
      if (linePoints.length > 0) {
          const lastP = linePoints[linePoints.length - 1];
          // 如果鼠标位置和最后一点不同，补点
          if (lastP.x !== mouse.x || lastP.y !== mouse.y) {
             linePoints.push({ x: mouse.x, y: mouse.y, age: 1.0 });
          }
      } else {
          // 初始点
          linePoints.push({ x: mouse.x, y: mouse.y, age: 1.0 });
      }
      
      for (let i = 0; i < linePoints.length; i++) {
        linePoints[i].age -= 0.015; 
        if (linePoints[i].age <= 0) {
          linePoints.splice(i, 1);
          i--;
        }
      }
      
      if (linePoints.length > 1) {
        hasActivity = true; // 有线条，标记为活跃
        const time = Date.now() / 5; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 0;
        
        for (let i = 0; i < linePoints.length - 1; i++) {
          const p1 = linePoints[i];
          const p2 = linePoints[i+1];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          const hue = (time + i * 5) % 360; 
          ctx.lineWidth = p1.age * 8; 
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${p1.age})`; 
          ctx.stroke();
        }
      }
    } 
    // === ⚡️ 极光射线 ===
    else if (trailStyle === 'laser') {
      const lastP = linePoints[linePoints.length - 1];
      // 只有在循环运行且鼠标真的在动（或刚开始）时才加点
      // 这里通过检测距离来添加点
      if (!lastP || (Math.abs(mouse.x - lastP.x) > 2 || Math.abs(mouse.y - lastP.y) > 2)) {
         linePoints.push({ x: mouse.x, y: mouse.y, age: 1.0 });
      }

      for (let i = 0; i < linePoints.length; i++) {
        linePoints[i].age -= 0.014;
        if (linePoints[i].age <= 0) {
          linePoints.splice(i, 1);
          i--;
        }
      }

      if (linePoints.length > 1) {
        hasActivity = true; // 有极光，标记为活跃
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Pass 1
        ctx.beginPath();
        for (let i = 0; i < linePoints.length - 1; i++) {
          const p1 = linePoints[i];
          const p2 = linePoints[i+1];
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.lineWidth = 14; 
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; 
        ctx.stroke();

        // Pass 2
        ctx.beginPath();
        for (let i = 0; i < linePoints.length - 1; i++) {
          const p1 = linePoints[i];
          const p2 = linePoints[i+1];
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.lineWidth = 6; 
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; 
        ctx.stroke();

        // Pass 3
        for (let i = 0; i < linePoints.length - 1; i++) {
          const p1 = linePoints[i];
          const p2 = linePoints[i+1];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineWidth = p1.age * 3;
          const opacity = Math.pow(p1.age, 0.5); 
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // === 粒子/星尘 逻辑 ===
    else {
      if (particles.length > 0) hasActivity = true; // 有粒子，标记为活跃

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        let dead = false;
        if (particles[i].size !== undefined && particles[i].size <= 0.1) dead = true;
        if (particles[i].life !== undefined && particles[i].life <= 0) dead = true;
        
        if (dead) {
          // 回收到对象池
          if (trailStyle === 'particle') particlePool.release(particles[i]);
          else if (trailStyle === 'sparkle') sparklePool.release(particles[i]);
          
          particles.splice(i, 1);
          i--;
        }
      }
    }

    // 🛑 检查退出条件 2: 屏幕上没有任何东西了
    if (!hasActivity) {
        animationId = null; // 标记循环停止，不再请求下一帧
        // 不需要 return，因为下面没有代码了，函数自然结束
    } else {
        // 还有东西在动，继续请求下一帧
        animationId = requestAnimationFrame(animate);
    }
  }
  
  // 初始启动尝试（如果一上来就有 trailStyle，可能会有一些残留逻辑，但通常mousemove会触发）
  // animate(); // 删除这行，改为惰性启动

  // --- 切换接口 ---
  window.changeTrailStyle = (style) => {
    trailStyle = style;
    localStorage.setItem('trailStyle', style);
    
    // 清理旧数据
    particles = [];
    linePoints = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 如果有循环正在跑，强制停止，让它下次 mousemove 重启
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    if (typeof showBubble === 'function') {
        if (style === 'off') {
            showBubble("鼠标特效已关闭，现在的鼠标静悄悄的喵～🤫");
        } else {
            let name = "";
            if(style === 'particle') name = "珍珠泡沫";
            if(style === 'line') name = "彩虹流光";
            if(style === 'sparkle') name = "闪亮星尘";
            if(style === 'laser') name = "极光射线"; 
            
            showBubble(`鼠标拖尾已切换为：${name} 喵！✨`);
        }
    }
  };
});
