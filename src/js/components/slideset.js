(function(addon) {

    var component;

    if (jQuery && UIkit) {
        component = addon(jQuery, UIkit);
    }

    if (typeof define == "function" && define.amd) {
        define("uikit-slideset", ["uikit"], function(){
            return component || addon(jQuery, UIkit);
        });
    }

})(function($, UI){

    "use strict";

    var Animations;

    UI.component('slideset', {

        defaults: {
            visible   : {},
            animation : 'scale',
            duration  : 200,
            group     : false
        },

        sets: [],

        boot: function() {

            // auto init
            UI.ready(function(context) {

                UI.$("[data-@-slideset]", context).each(function(){

                    var ele = UI.$(this);

                    if(!ele.data("slideset")) {
                        var plugin = UI.slideset(ele, UI.Utils.options(ele.attr("data-@-slideset")));
                    }
                });
            });
        },

        init: function() {

            var $this = this;

            this.activeSet = false;
            this.list      = this.element.find('.@-slideset-list');
            this.nav       = this.element.find('.@-slideset-nav');

            UI.$win.on("resize load", UI.Utils.debounce(function() {
                $this.updateSets();
            }, 100));

            this.group = this.options.group;

            this.updateSets();

            this.on("click", '[data-@-set]', function(e) {

                e.preventDefault();

                var set = UI.$(this).data(UI._prefix+'Set');

                if ($this.activeSet === set) return;

                switch(set) {
                    case 'next':
                    case 'previous':
                        $this[set=='next' ? 'next':'previous']();
                        break;
                    default:
                        $this.show(set);
                }

            });

            this.on('click', '[data-uk-set-group]', function(e){
                e.preventDefault();
                $this.group = $(this).data('ukSetGroup');
                $this.updateSets(true, true);
            });

            this.on('swipeRight swipeLeft', function(e) {
                $this[e.type=='swipeLeft' ? 'next' : 'previous']();
            });
        },

        updateSets: function(animate, force) {

            var visible = this.visible, i;

            this.visible  = this.getVisibleOnCurrenBreakpoint();

            if (visible == this.visible && !force) {
                return;
            }

            this.children = this.list.children().hide();
            this.items    = this.getItems();
            this.sets     = array_chunk(this.items, this.visible);

            for (i=0;i<this.sets.length;i++) {
                this.sets[i].attr({'style': 'display:none;', 'class': 'uk-width-1-'+this.visible});
            }

            // update nav
            if (this.nav.length && this.nav.empty()) {

                for (i=0;i<this.sets.length;i++) {
                    this.nav.append('<li data-uk-set="'+i+'"><a></a></li>');
                }
            }

            if (this.group!==false) {
                this.element.find('[data-uk-set-group]').removeClass('uk-active').filter('[data-uk-set-group="'+this.group+'"]').addClass('uk-active');
            }

            this.activeSet = false;
            this.show(0, !animate);
        },

        getVisibleOnCurrenBreakpoint: function() {

            // number of visibles on all breakpoints
            if (!isNaN(this.options.visible)) {
                return parseInt(this.options.visible, 10);
            }

            var breakpoint  = null,
                tmp         = UI.$('<div style="position:absolute;height:1px;top:-1000px;"></div>').appendTo('body'),
                breakpoints = $.extend({
                    'large'  : 4,
                    'medium' : 4,
                    'small'  : 1
                }, this.options.visible);

                ['large', 'medium', 'small'].forEach(function(bp) {

                    tmp.attr('class', 'uk-visible-'+bp).width();

                    if (!breakpoint && tmp.is(':visible')) {
                        breakpoint = bp;
                    }
                });

                tmp.remove();

                return breakpoints[breakpoint] || 3;
        },

        getItems: function() {

            var items = [], filter;

            if (this.group) {

                filter = this.group || [];

                if (typeof(filter) === 'string') {
                    filter = filter.split(/,/).map(function(item){ return item.trim(); });
                }

                this.children.each(function(index){

                    var ele = $(this), f = ele.data('group'), infilter = filter.length ? false : true;

                    if (f) {

                        f = f.split(/,/).map(function(item){ return item.trim(); });

                        filter.forEach(function(item){
                            if (f.indexOf(item) > -1) infilter = true;
                        });
                    }

                    if(infilter) items.push(ele[0]);
                });

                items = $(items);

            } else {
                items = this.list.children();
            }

            return items;
        },

        show: function(setIndex, noanimate) {

            var $this = this;

            if (this.activeSet === setIndex || this.animating) {
                return;
            }

            var current   = this.sets[this.activeSet] || [],
                next      = this.sets[setIndex],
                animation = Animations[this.options.animation] || function(current, next) {

                    if (!$this.options.animation) {
                        return Animations.none.apply($this);
                    }

                    var anim = $this.options.animation.split(',');

                    if (anim.length == 1) {
                        anim[1] = anim[0];
                    }

                    anim[0] = anim[0].trim();
                    anim[1] = anim[1].trim();

                    return coreAnimation.apply($this, [anim, current, next]);
                };

            if (noanimate || !UI.support.animation) {
                animation = Animations.none;
            }

            $this.animating = true;

            if ($this.nav.length) {
                $this.nav.children().removeClass(UI.prefix('@-active')).eq(setIndex).addClass(UI.prefix('@-active'));
            }

            animation.apply($this, [current, next, setIndex < this.activeSet ? -1:1]).then(function(){

                UI.Utils.checkDisplay(next, true);

                $this.children.hide();
                next.show();

                $this.animating = false;
                $this.activeSet = setIndex;

                UI.Utils.checkDisplay(next, true);

                $this.trigger('show.uk.slideset', [next]);
            });

        },

        next: function() {
            this.show(this.sets[this.activeSet + 1] ? (this.activeSet + 1) : 0);
        },

        previous: function() {
            this.show(this.sets[this.activeSet - 1] ? (this.activeSet - 1) : (this.sets.length - 1));
        }
    });

    Animations = {

        'none': function() {
            var d = $.Deferred();
            d.resolve();
            return d.promise();
        },

        'fade': function(current, next) {
            return coreAnimation.apply(this, ['@-animation-fade', current, next]);
        },

        'slide-bottom': function(current, next) {
            return coreAnimation.apply(this, ['@-animation-slide-bottom', current, next]);
        },

        'slide-top': function(current, next) {
            return coreAnimation.apply(this, ['@-animation-slide-top', current, next]);
        },

        'slide-vertical': function(current, next, dir) {

            var anim = ['@-animation-slide-top', '@-animation-slide-bottom'];

            if (dir == -1) {
                anim.reverse();
            }

            return coreAnimation.apply(this, [anim, current, next]);
        },

        'slide-horizontal': function(current, next, dir) {

            var anim = ['@-animation-slide-right', '@-animation-slide-left'];

            if (dir == -1) {
                anim.reverse();
            }

            return coreAnimation.apply(this, [anim, current, next, dir]);
        },

        'scale': function(current, next) {
            return coreAnimation.apply(this, ['@-animation-scale-up', current, next]);
        }
    };

    UI.slideset.animations = Animations;

    // helpers

    function coreAnimation(cls, current, next, dir) {

        var d = $.Deferred(), clsIn, clsOut, release, delay = Math.floor(this.options.duration/2), i;

        dir = dir || 1;

        if (next[0]===current[0]) {
            d.resolve();
            return d.promise();
        }

        if (typeof(cls) == 'object') {
            clsIn  = UI.prefix(cls[0]);
            clsOut = UI.prefix(cls[1] || cls[0]);
        } else {
            clsIn  = UI.prefix(cls);
            clsOut = clsIn;
        }

        release = function() {

            if (current && current.length) {
                current.hide().removeClass(UI.prefix(clsOut+' @-animation-reverse')).css({'animation-delay': '', 'animation':''});
            }

            for (i=0;i<next.length;i++) {
                next.eq(dir == 1 ? i:(next.length - i)-1).css('animation-delay', (i*delay)+'ms');
            }

            next.addClass(clsIn)[dir==1 ? 'last':'first']().one(UI.support.animation.end, function() {

                next.removeClass(''+clsIn+'').css({opacity:'', display:'', 'animation-delay':'', 'animation':''});

                d.resolve();

            }).end().css('display', '');
        };

        next.css('animation-duration', this.options.duration+'ms');

        if (current && current.length) {

            current.css('animation-duration', this.options.duration+'ms')[dir==1 ? 'last':'first']().one(UI.support.animation.end, function() {
                release();
            });

            for (i=0;i<current.length;i++) {

                (function (index, ele){

                    setTimeout(function(){
                        ele.css('display', 'none').css('display', '').css('opacity', 0).addClass(UI.prefix(clsOut+' @-animation-reverse'));
                    }.bind(this), i * delay);

                })(i, current.eq(dir == 1 ? i:(current.length - i)-1));
            }

        } else {
            release();
        }

        return d.promise();
    }

    function array_chunk(input, size) {

        var x, i = 0, c = -1, l = input.length || 0, n = [];

        if (size < 1) return null;

        while (i < l) {

            x = i % size;

            if(x) {
                n[c][x] = input[i];
            } else {
                n[++c] = [input[i]];
            }

            i++;
        }

        i = 0;
        l = n.length;

        while (i < l) {
            n[i] = jQuery(n[i]);
            i++;
        }

        return n;
    }

});