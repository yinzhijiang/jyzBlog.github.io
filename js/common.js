function getBaseType(target) {
    return Object.prototype.toString.apply(target).slice(8, -1);
}

function eachObj(obj, fn) {
    for(var key in obj) {
        fn(obj[key], key, obj);
    }
}

function getKeys(obj, sort) {
    var keys = [];

    eachObj(obj, function(value, key) {
        keys.push(key);
    });

    return keys.sort(sort);
}

function extend(obj, target) {
    eachObj(target, function(value, key) {
        obj[key] = value;
    });

    return obj;
}

function getPosition(element) {
    var x = 0;
    var y = 0;
    if (!element.tagName) {
        console.warn('element must be a HTML element object');
        return {
            x: null,
            y: null
        };
    }
    while (element !== document.body) {
        x += element.offsetLeft;
        y += element.offsetTop;
        element = element.offsetParent;
    }
    return {
        x: x,
        y: y
    };
}// 功能函数
(function(win) {
    function Pack(ele) {
        this.ele = ele;
        this.record = [];
        this.index = 0;
        this.dir = 1;
        this.status = false;
    }

    Pack.prototype = {
        _toggleClass: function(className, next) {
            var self = this;
            classArr = className.split(' ');

            classArr.forEach(function(cls) {
                self.ele.classList.toggle(cls);
            });

            next && setTimeout(next, 10);
        },

        _transfromClass: function(className, next) {
            var self = this;

            this.ele.addEventListener('transitionend', function fun(event) {
                if (self.ele === event.target) {
                    next();
                    self.ele.removeEventListener('transitionend', fun);
                }
            });

            this._toggleClass(className);
        },

        _animationClass: function(className, next) {
            var self = this;

            this.ele.addEventListener('animationend', function fun(event) {
                if (self.ele === event.target) {
                    next();
                    self.ele.removeEventListener('animationend', fun);
                }
            });

            this._toggleClass(className);
        },

        _toggle: function() {
            var opt = this.record[this.index];

            if (this.index === this.record.length || this.index === -1) {
                this.end && this.end();
                this.index = this.dir > 0 ? this.index - 1 : 0;
                this.dir *= -1;
                this.status = false;
                return;
            }

            switch(opt.type) {
                case 'class':
                    this._toggleClass(opt.className, this._toggle.bind(this));
                    break;
                case 'transfrom':
                    this._transfromClass(opt.className, this._toggle.bind(this));
                    break;
                case 'animation':
                    this._animationClass(opt.className, this._toggle.bind(this));
                    break;
            }

            this.index += this.dir;
        },

        base: function(className) {
            this.record.push({
                className: className || 'js-open',
                type: 'class'
            });

            return this;
        },

        transfrom: function(className) {
            this.record.push({
                className: className,
                type: 'transfrom'
            });

            return this;
        },

        animation: function(className) {
            this.record.push({
                className: className,
                type: 'animation'
            });

            return this;
        },

        toggle: function() {
            if (this.status) return;

            if (this.index === 0 || this.index === this.record.length - 1) {
                this.status = true;
            }

            this._toggle();
        },

        lastStart: function() {
            var self = this;

            this.status = false;
            this.index = this.record.length - 1;
            this.dir = -1;

            this.record.forEach(function(record) {
                self.ele.classList.add(record.className);
            });

            return this;
        },

        end: function(fun) {
            this.end = fun;
            return this;
        }
    }

    win.Pack = Pack;
})(window);// 动画函数
(function(win) {
    // 匀速运动
    function linear(option) {
        var
            time = option.time,
            now = option.now,
            aims = option.aims,
            spendTime = option.spendTime;

        var next = now + (aims - now) * 60 / (time - spendTime);

        return aims - now > 0 
            ? next >= aims ? aims : next
            : next <= aims ? aims : next;
    }

    function Amt() {
        this.record = [];
        this.timeoutMap = {};
        this.listeners = {
            start: [],
            frame: [],
            end: []
        };
        this.frames = 0;
        
        this._init();
    }

    Amt.prototype = {
        _init: function() {
            this.index = 0;
            this.nowIndex = 0;
            this.timer = null;
            this.time = 0;
            this.startTime = null;
            this.record.forEach(function(point) {
                eachObj(point, function(value, key) {
                    if (~key.indexOf('_')) return;

                    point[key].now = point[key].from;
                });
            });

            return this;
        },
        // 获取当前周期已消耗的时间
        _getSpendTime: function() {
            var 
                otherPointSpendTime,
                time = this.time,
                nowIndex = this.nowIndex;

            otherPointSpendTime = this.record.reduce(function(p, n, idx) {
                if (idx < nowIndex) {
                    p += n['_time'];
                }

                return p;
            }, 0);

            return time - otherPointSpendTime;
        },
        // 启动逐帧渲染器
        _request: function(fun) {
            var requestAnimationFrame = window.requestAnimationFrame 
                || window.mozRequestAnimationFrame 
                || window.webkitRequestAnimationFrame 
                || window.msRequestAnimationFrame;

            this.timer = requestAnimationFrame(fun);
            return this;
        },
        // 关闭逐帧渲染器
        _cancel: function() {
            var cancelAnimationFrame = window.cancelAnimationFrame 
                || window.mozCancelAnimationFrame 
                || window.webkitCancelAnimationFrame 
                || window.msCancelAnimationFrame;

            cancelAnimationFrame(this.timer);
            return this;
        },
        // 缓动算法
        _algorithm: function(option) {
            var
                type = option.type || 'linear',
                time = option.time || 1000,
                now = option.now,
                aims = option.aims || 0,
                spendTime = option.spendTime || 0;

            switch(type) {
                case 'linear':
                    return linear({
                        time: time,
                        now: now,
                        aims: aims,
                        spendTime: spendTime
                    });
            }
        },
        // 触发事件
        _emit: function(event, option) {
            this.listeners[event] && this.listeners[event].forEach(function(handler) {
                handler(option);
            });

            return this;
        },
        // 事件
        on: function(event, handler) {
            if (~getKeys(this.listeners).indexOf(event) && handler) {
                this.listeners[event].push(handler);
            }

            return this;
        },
        // 起始点
        from: function(option) {
            option = option || {};
            var point = this.record[this.index] || {};

            eachObj(option, function(value, key) {
                point[key] = {
                    from: value,
                    now: value,
                    to: 0
                };
            });

            this.record[this.index] = point;

            return this;
        },
        // 目标点
        to: function(option) {
            option = option || {};
            var point = this.record[this.index] || {};

            eachObj(option, function(value, key) {
                point[key] = extend(point[key] || {
                    from: 0,
                    now: 0
                }, {
                    to: value
                });
            });

            this.record[this.index] = point;

            return this;
        },
        // 变换规律
        transition: function(option) {
            var 
                type,
                time;

            if (typeof option === 'string') {
                time = option;
            } else {
                type = option.type || 'linear';
                time = option.time || 1000;
            }

            var point = this.record[this.index] || {};

            extend(point, {
                '_time': time,
                '_type': type
            });

            this.record[this.index] = point;

            return this;
        },
        // 进入下一个变换周期
        next: function() {
            this.index = this.record.length;
            return this;
        },
        // 等待
        timeout: function(time) {
            if (time && typeof time === 'number') {
                var index = this.record.length === 0 ? -1 : this.index;
                this.timeoutMap[index] = this.timeoutMap[index] != null
                    ? this.timeoutMap[index] + time
                    : time;
            }

            return this;
        },
        // 启动动画
        start: function() {
            var 
                record = this.record,
                self = this;

            return this
                .next()
                ._emit('start')
                ._request(function render() {
                    var 
                        point = record[self.nowIndex],
                        result = {};

                    if (!self.startTime && self.timeoutMap['-1']) {
                        self.startTime = (new Date()).getTime();
                        self.pause();
                        setTimeout(function() {
                            self._request(render);
                        }, self.timeoutMap['-1']);

                        return;
                    }

                    if (self.time === point['_time']) {
                        var timeout = self.timeoutMap[self.nowIndex];
                        
                        self.time = 0;
                        self.nowIndex++;
                        if (timeout) {
                            self.pause();
                            setTimeout(function() {
                                self._request(render)
                            }, timeout);
                            return;
                        }
                        
                        point = record[self.nowIndex];
                    }

                    if (self.nowIndex === record.length) {
                        self._emit('end').close();
                        return;
                    }

                    eachObj(point, function(item, key) {
                        if (~key.indexOf('_')) return;

                        var nextValue = self._algorithm({
                            type: point['_type'],
                            time: point['_time'],
                            now: item['now'],
                            aims: item['to'],
                            spendTime: self.time
                        });

                        result[key] = nextValue;
                        point[key].now = nextValue;

                        if (nextValue === item['to']) {
                            self.time = point['_time'];
                        }
                    });

                    if (self.time != point['_time']) {
                        self.time += 60;
                    }

                    self._emit('frame', result);
                    self.frames++;
                    self._request(render);
                });
        },
        // 暂停
        pause: function() {
            return this._cancel();
        },
        // 关闭动画
        close: function() {
            return this._cancel()._init();
        }
    }

    win.Amt = Amt;
})(window);// loading
document.onreadystatechange = function(){
    var page = document.getElementById('page');
    if (document.readyState == 'interactive') {
        window.setTimeout(function(){
            disableLoad();
        },4000)
    }

    if (document.readyState == 'complete') {        
        if (page.classList.contains('js-hidden')) {
            disableLoad();
        }
    }
}

function disableLoad(){
    var
    page = document.getElementById('page'),
    loading = document.getElementById('page-loading');

    loading.classList.add('js-hidden');
    page.classList.remove('js-hidden');
}window.addEventListener('load', function() {
    (function() {
        var headerEle = document.getElementById('page-header');

        function toggleNavStyle() {
            var scrollTop = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;

            headerEle.classList[ scrollTop > 30 ? 'add' : 'remove' ]('page__header--small');
        }

        headerEle && document.addEventListener('scroll', toggleNavStyle);
    })();
    
    (function() {
        var 
            btn = document.querySelector('button.page__menu-btn'),
            menu = document.querySelector('nav.page__nav');

        if (btn && menu) {
            var packMenu = new Pack(menu);

            packMenu.base('js-open').transfrom('page__nav--open');

            btn.addEventListener('click', function() {
                packMenu.toggle();
            });
        }
    })();

    (function() {
        var header = document.getElementById('page-header');
        
        if (!header) return;

        var
            title = header.querySelector('.info__title'),
            desc = header.querySelector('.info__desc');

        title && new Pack(title)
            .animation('js-animation')
            .end(function() {
                var arr = ['js-animation'];

                arr.forEach(function(item) {
                    title.classList.remove(item);
                });
            })
            .toggle();

        desc && new Pack(desc)
            .base('js-ease-out-leave-active')
            .base('js-ease-out-leave')
            .transfrom('js-ease-out-enter-active')
            .end(function() {
                var arr = ['js-ease-out-enter', 'js-ease-out-enter-active', 'js-ease-out-leave', 'js-ease-out-leave-active'];

                arr.forEach(function(item) {
                    desc.classList.remove(item);
                });
            })
            .toggle();
    })();
});window.addEventListener('load', function() {
    // 回到顶部
    (function() {
        var 
            backTopEle = document.getElementById('back-top'),
            packBackTop = new Pack(backTopEle);

        if (backTopEle) {
            packBackTop.transfrom('back-top--hidden').base('js-hidden').lastStart();

            function toggleBackTop() {
                var 
                    scrollTop = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop,
                    isHidden = backTopEle.classList.contains('back-top--hidden') && backTopEle.classList.contains('js-hidden');

                if ((scrollTop > 350 && isHidden) || (scrollTop < 350 && !isHidden)) {
                    packBackTop.toggle();
                }
            }

            toggleBackTop();
            document.addEventListener('scroll', toggleBackTop);

            backTopEle.addEventListener('click', function() {
                var backTopAmt = new Amt();

                backTopAmt
                    .from({
                        top: window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop
                    })
                    .to({
                        top: 0
                    })
                    .transition(1000)
                    .on('frame', function(data) {
                        window.scrollTo(0, data.top);
                    })
                    .start();
            });
        }
    })();
});
window.addEventListener('load', function() {
    function addListener(callback) {
        var 
            timer = null,
            requestAnimationFrame = window.requestAnimationFrame 
                || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame
                || window.msRequestAnimationFrame,
            cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

        function lintener() {
            cancelAnimationFrame(timer);

            timer = requestAnimationFrame(callback.bind(null, function() {
                document.removeEventListener('scroll', lintener);
            }));
        }

        document.addEventListener('scroll', lintener);

        lintener();
    }

    window._skappPostAnimation = function() {
        var posts = document.querySelectorAll('article.page__mini-article');
        
        posts.forEach(function(post) {
            if (post.parentElement.parentElement.classList.contains('js-hidden')) return;

            var position = getPosition(post);

            var pack = new Pack(post);

            pack
                .base('js-ease-out-leave-active')
                .base('js-ease-out-leave')
                .transfrom('js-ease-out-enter-active')
                .end(function() {
                    var arr = ['js-ease-out-enter', 'js-ease-out-enter-active', 'js-ease-out-leave', 'js-ease-out-leave-active'];

                    arr.forEach(function(item) {
                        post.classList.remove(item);
                    });
                })

            addListener(function(remove) {
                var diff = position.y - window.scrollY - document.documentElement.clientHeight;

                if (diff < 50) {
                    remove();

                    pack.toggle();
                }
            });
        });
    }

    window._skappPostAnimation();
});