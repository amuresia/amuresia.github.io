var timeColor = (typeof timeColor !== 'undefined') ? timeColor : "green";
var waitingColor = (typeof waitingColor !== 'undefined') ? waitingColor : "#ff9933";
var noDateColor = (typeof noDateColor !== 'undefined') ? noDateColor : "green";
var timeBarWidth = (typeof timeBarWidth !== 'undefined') ? timeBarWidth : false;
var timezoneOffsetHours = (typeof timezoneOffsetHours !== 'undefined') ? timezoneOffsetHours : -2; // Romanian timezone offset

(async () => {
    // Server millisecond tracking
    let serverMsZero = null;
    let serverMsTimer = null;

    function getServerTime() {
        var d = $('#serverDate').text(),
            t = $('#serverTime').text(),
            m = d.match(/(..)\/(..)\/(....)/);
        return m[3] + '-' + m[2] + '-' + m[1] + ' ' + t;
    }

    function getServerMs() {
        if (serverMsZero === null) return 0;
        var currMs = new Date().getMilliseconds();
        return (1000 + currMs - serverMsZero) % 1000;
    }

    function initServerMsTracking() {
        if (!$('#serverMs').length) {
            $('#serverTime').after('<span id="serverMs"></span>');
        }

        var serverTime = getServerTime(),
            prev = serverTime;

        var timer = setInterval(function () {
            serverTime = getServerTime();
            if (serverTime !== prev) {
                serverMsZero = new Date().getMilliseconds();
                clearInterval(timer);
                serverMsTimer = setInterval(function () {
                    var ms = getServerMs();
                    $('#serverMs').text(':' + ('00' + ms).substr(-3));
                }, 5);
            }
            prev = serverTime;
        }, 100);
    }

    // Initialize server ms tracking
    initServerMsTracking();
    if (typeof window.twLib === 'undefined') {
        window.twLib = {
            queues: null,
            init: function () {
                if (this.queues === null) {
                    this.queues = this.queueLib.createQueues(5);
                }
            },
            queueLib: {
                maxAttempts: 3,
                Item: function (action, arg, promise = null) {
                    this.action = action;
                    this.arguments = arg;
                    this.promise = promise;
                    this.attempts = 0;
                },
                Queue: function () {
                    this.list = [];
                    this.working = false;
                    this.length = 0;

                    this.doNext = function () {
                        let item = this.dequeue();
                        let self = this;

                        if (item.action === 'openWindow') {
                            window.open(...item.arguments).addEventListener('DOMContentLoaded', function () {
                                self.start();
                            });
                        } else {
                            $[item.action](...item.arguments).done(function () {
                                item.promise.resolve.apply(null, arguments);
                                self.start();
                            }).fail(function () {
                                item.attempts += 1;
                                if (item.attempts < twLib.queueLib.maxAttempts) {
                                    self.enqueue(item, true);
                                } else {
                                    item.promise.reject.apply(null, arguments);
                                }

                                self.start();
                            });
                        }
                    };

                    this.start = function () {
                        if (this.length) {
                            this.working = true;
                            this.doNext();
                        } else {
                            this.working = false;
                        }
                    };

                    this.dequeue = function () {
                        this.length -= 1;
                        return this.list.shift();
                    };

                    this.enqueue = function (item, front = false) {
                        (front) ? this.list.unshift(item) : this.list.push(item);
                        this.length += 1;

                        if (!this.working) {
                            this.start();
                        }
                    };
                },
                createQueues: function (amount) {
                    let arr = [];

                    for (let i = 0; i < amount; i++) {
                        arr[i] = new twLib.queueLib.Queue();
                    }

                    return arr;
                },
                addItem: function (item) {
                    let leastBusyQueue = twLib.queues.map(q => q.length).reduce((next, curr) => (curr < next) ? curr : next, 0);
                    twLib.queues[leastBusyQueue].enqueue(item);
                },
                orchestrator: function (type, arg) {
                    let promise = $.Deferred();
                    let item = new twLib.queueLib.Item(type, arg, promise);

                    twLib.queueLib.addItem(item);

                    return promise;
                }
            },
            ajax: function () {
                return twLib.queueLib.orchestrator('ajax', arguments);
            },
            get: function () {
                return twLib.queueLib.orchestrator('get', arguments);
            },
            post: function () {
                return twLib.queueLib.orchestrator('post', arguments);
            },
            openWindow: function () {
                let item = new twLib.queueLib.Item('openWindow', arguments);

                twLib.queueLib.addItem(item);
            }
        };

        twLib.init();
    }
    let ranEndTimeSound = false;
    const getServerDateTime = () => {
        const [hour, min, sec, day, month, year] = $('#serverTime').closest('p').text().match(/\d+/g);
        return new Date(year, (month - 1), day, hour, min, sec).getTime();
    }
    const serverDateTime = getServerDateTime();
    // Calculate the offset correctly - positive if server is ahead, negative if behind
    const serverOffset = new Date(serverDateTime) - new Date();
    console.log("Server offset:", (serverOffset / 1000 / 60 / 60).toFixed(2) + "h");


    const checkEndTimeWarning = async () => {
        if (new URLSearchParams(document.referrer).get('endTimeWarning') === '1' && !ranEndTimeSound) {
            const endTime = $('#timer2').data('endtime') * 1000;

            if (endTime - new Date().getTime() < 5000) {
                TribalWars.playSound('chat');
                ranEndTimeSound = true;
            }
        }
    };

    const handleTimers = () => {
        Timing.tickHandlers.timers.handleTimerEnd = function () {
            $(this).text('Too Late!');
            $(this).css('color', 'red');
        };
        Timing.tickHandlers.timers.init();
    }

    function msToDatetimeLocal(ms) {
        goalDate = new Date(ms);
        string = (goalDate.getFullYear() + "-" +
            ("0" + (goalDate.getMonth() + 1)).slice(-2) + "-" +
            ("0" + goalDate.getDate()).slice(-2) + "T" +
            ("0" + goalDate.getHours()).slice(-2) + ":" +
            ("0" + goalDate.getMinutes()).slice(-2) + ":" +
            ("0" + goalDate.getSeconds()).slice(-2));
        return string;
    }


    Incomings = {
        settings: null,
        remember: false,
        delay: 0,
        init: function () {
            this.loadSettings();
            this.createTable(() => {
                // Commands table loaded
            });
        },
        updateSettings: function () {
            if (this.remember) {
                this.settings.remember = this.remember;
                this.settings.delay = this.delay;
            } else {
                this.settings.remember = false;
                this.settings.delay = 0;
            }
            localStorage.setItem(game_data.world + 'confirmenhancersettings', JSON.stringify(this.settings));
        },
        loadSettings: function () {
            var settings = JSON.parse(localStorage.getItem(game_data.world + 'confirmenhancersettings')) || {};
            if (localStorage.getItem(game_data.world + 'confirmenhancersettings') === null) {
                settings.delay = 0;
                settings.remember = false;
                localStorage.setItem(game_data.world + 'confirmenhancersettings', JSON.stringify(settings));
            }
            this.settings = settings;
            this.remember = this.settings.remember;
            this.delay = this.settings.delay;
        },
        retrieveInput: function () {
            // Delay moved to SnipeTool
        },
        createTable: function (_callback) {
            var form = document.getElementById("command-data-form");
            var villageUrl = document.getElementById("command-data-form").getElementsByClassName("village_anchor")[0].getElementsByTagName("a")[0].href;
            var duration = $('#date_arrival span').data('duration') * 1000;
            const previousUrlSearchParams = new URLSearchParams(document.referrer);

            var parent = this;

            $.when(loadRunningCommands(villageUrl).done(function (html) {
                const commandsTable = $(html).find('.commands-container');
                if (commandsTable.length > 0) {
                    commandsTable.find('tr:first').append('<th>Send in</th>');
                    commandsTable.find('tr.command-row').each(function () {
                        $(this).css('cursor', 'pointer');
                        const sendTime = ($(this).find('td:last span').data('endtime') * 1000) - duration;
                        $(this).append(`<td class="sendTime"><b><span class="timer" style="color: darkblue" data-endtime="${sendTime / 1000}"></span></b></b><br></td>`);
                    });
                    // Append commands table to the form (after all snipe tool elements)
                    $(form).append(commandsTable);
                    handleTimers();
                }
                if ($('#remember').is(':not(:checked)') && document.referrer.indexOf('arrivalTimestamp') > -1) {
                    let delay = $('#delay').val();
                    if (!delay.trim().length) delay = 0;
                    const arrivalTime = new Date(parseInt(previousUrlSearchParams.get('arrivalTimestamp')) + parseInt(delay));
                    parent.fillSnipeTool(arrivalTime, true);
                }

                _callback();

                // Select a command, Change color of selected Command. Update
                // the selected time/date
                commandClick();

                function commandClick() {
                    $(".command-row").click(function () {
                        const indexElement = $(this).closest('table').find('th:not(:contains("Actuele Aankomst")):contains("Aankomst"):first, th:contains("Arrival"):first');
                        const index = indexElement?.length ? $(indexElement).index() : 1;

                        $(this).closest("tbody").find("td").css('background-color', '');
                        $(this).find("td").css("background-color", "white");
                        parent.fillSnipeTool($(this).find("td")[index].textContent);
                    });
                }

                window.enableIncomingsClicker = () => commandClick();

                // Expose method

                // Add the timer for the command arrivel countdowns
                $(".widget-command-timer").addClass("timer");
                handleTimers();
                if (typeof enableCommandRowClick === 'function') window.enableCommandRowClick();

                if (timeBarWidth) {
                    $('.village_anchor').removeClass('village_anchor');
                    $('#command-data-form .vis:first, #date_arrival').width(timeBarWidth);
                }
            }))

        },
        /* NOTE This doesnt trigger the eventlisteners which update the input of
         *      the snipetool. Fix this */
        fillSnipeTool: function (timeString, isTimestamp) {
            let date = timeString;
            if (!isTimestamp) {
                // Parse the time string - handle both HH:MM:SS.mmm and HH:MM:SS formats
                const timeMatch = timeString.match(/(\d+):(\d+):(\d+)(?:\.(\d+))?/);
                if (!timeMatch) return;
                
                const [, hour, min, sec, ms] = timeMatch;
                let [day, month, year] = $('#serverDate').text().split('/').map(u => Number(u));
                
                // Create date with seconds only first
                date = new Date(year, (month - 1), day, parseInt(hour), parseInt(min), parseInt(sec), 0);

                if (timeString.match(window.lang['57d28d1b211fddbb7a499ead5bf23079'].split(' ')[0])) {
                    date = new Date(year, (month - 1), day + 1, parseInt(hour), parseInt(min), parseInt(sec), 0);
                } else if (timeString.match(/\d+\.\d+\.\d+|\d+\.\d+|\d+\/\d+\/\d+/)) {
                    [day, month, year] = timeString.includes('om') ? timeString.split('om')[0].match(/\d+/g)
                        : timeString.match(/\d+/g);
                    if (!year) year = new Date().getFullYear().toString();

                    const yearPrefix = new Date(date).getFullYear().toString().slice(0, 2);
                    const correctYear = year.length === 4 ? year : yearPrefix + year;

                    date = new Date(correctYear, (month - 1), day, parseInt(hour), parseInt(min), parseInt(sec), 0);
                }
                
                // Now set milliseconds separately
                if (ms) {
                    date.setMilliseconds(parseInt(ms));
                }
            }
            
            // Set the inputs
            const finalMs = date.getMilliseconds();
            document.getElementById("msgoal").value = finalMs;
            document.getElementById("timegoal").value = msToDatetimeLocal(date.getTime());
            
            console.info("fillSnipeTool:", {
                timeString: timeString,
                finalDate: date.toISOString(),
                milliseconds: finalMs
            });

            // Fire events
            var event = new Event('input');
            msgoal.dispatchEvent(event);
            timegoal.dispatchEvent(event);
        }
    }


    SnipeTool = {
        sendButton: null,
        oldElement: null,
        fps: 144,
        settings: null,
        remember: false,
        msGoal: 0,
        msDelay: 0,
        timeGoal: 0,
        prevTimeGoal: 0,
        duration: 0,
        serverOffset: 0,
        init: function () {
            this.sendButton = document.getElementById("troop_confirm_submit");
            this.oldElement = document.getElementById("date_arrival");

            this.loadSettings();
            this.duration = $('#date_arrival span').data('duration') * 1000;
            this.serverOffset = serverOffset;


            /* Create all HTML elements for display. */
            var progressBar = document.createElement("bar");
            var timeGoalInput = document.createElement("timegoal");
            var msGoalInput = document.createElement("msgoal");
            var msDelayInput = document.createElement("msdelay");
            var rememberInput = document.createElement("remember")
            progressBar.innerHTML = ("<div id='progress_bar'><div id='time'></div><div id='bar'></div></div>");
            timeGoalInput.innerHTML = ("<div width='100%'>snipe time: <input type='datetime-local' max=\"9999-12-31T23:59:59\" id='timegoal' step='1'></div>");
            msGoalInput.innerHTML = ("<div width='100%'>snipe ms: <input type='number' id='msgoal' style='width: 100px;'/></div>");
            msDelayInput.innerHTML = ("<div width='100%'>delay (subtract): <input type='number' id='msdelay' style='width: 100px;' value='0'/> <span id='effectiveMs' style='color: #666;'></span></div>");
            rememberInput.innerHTML = ("<div width='100%'><label>remember: <input type='checkbox' id='remember'/></label><div id='watermark'>made by Ricardo/Bottenkraker.</div></div>");

            this.oldElement.appendChild(progressBar);
            this.oldElement.appendChild(timeGoalInput);
            this.oldElement.appendChild(msGoalInput);
            this.oldElement.appendChild(msDelayInput);
            this.oldElement.appendChild(rememberInput);

            // Add send time element to the command form
            var stuur = document.createElement("tr");
            if (this.timeGoal !== 0) {
                var sendTime = this.timeGoal - this.duration + this.serverOffset + (timezoneOffsetHours * 60 * 60 * 1000);
                var sendDate = new Date(sendTime)
                stuur.innerHTML = ("<td>Ora trimiterii:</td><td>" + sendDate.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'numeric'
                }) + "&nbsp;" + "<b>" + sendDate.toLocaleTimeString() + "</b>" + "&nbsp;&nbsp;&nbsp;(<span class='timer' id='timer2' data-endtime='" + sendTime / 1000 + "'></span>)</td>");

                $(window.TribalWars).on("global_tick", async function () {
                    document.title = 'Send in: ' + $('#timer2').text();

                    await checkEndTimeWarning();
                });

            } else {
                stuur.innerHTML = ("<td>Timp ramas:</td><td></td>");
            }
            document.getElementById("command-data-form").getElementsByTagName("table")[0].getElementsByTagName("tbody")[0].appendChild(stuur);
            stuur.id = 'sendtime';
            handleTimers();

            document.getElementById("remember").checked = this.remember;
            if (this.timeGoal !== 0) {
                document.getElementById("timegoal").value = msToDatetimeLocal(this.timeGoal);
            }
            document.getElementById("msgoal").value = this.msGoal;
            document.getElementById("msdelay").value = this.msDelay;
            this.updateEffectiveMs();

            /* NOTE: I think this function sometimes executes before the input
             *       table is made. */
            this.retrieveInput();

        },
        loadSettings: function () {
            var settings = JSON.parse(localStorage.getItem(game_data.world + 'snipesettings')) || {};
            if (localStorage.getItem(game_data.world + 'snipesettings') === null) {
                settings.msGoal = 0;
                settings.msDelay = 0;
                settings.timeGoal = 0;
                settings.remember = false;
                localStorage.setItem(game_data.world + 'snipesettings', JSON.stringify(settings));
            }
            this.settings = settings;
            this.remember = this.settings.remember;
            this.msGoal = this.settings.msGoal;
            this.msDelay = this.settings.msDelay || 0;
            this.timeGoal = this.settings.timeGoal;
        },
        updateSettings: function () {
            if (this.remember) {
                this.settings.msGoal = this.msGoal;
                this.settings.msDelay = this.msDelay;
                this.settings.timeGoal = this.timeGoal;
                this.settings.remember = this.remember;
            } else {
                this.settings.msGoal = 0;
                this.settings.msDelay = 0;
                this.settings.timeGoal = 0;
                this.settings.remember = false;
            }
            localStorage.setItem(game_data.world + 'snipesettings', JSON.stringify(this.settings));
        },
        updateEffectiveMs: function () {
            var effectiveMs = (this.msGoal - this.msDelay + 1000) % 1000;
            document.getElementById('effectiveMs').innerHTML = '→ effective: <b>' + effectiveMs + '</b> ms';
        },
        retrieveInput: function () {
            msgoal.addEventListener("input", () => {
                this.msGoal = parseInt(document.getElementById("msgoal").value) || 0;
                console.info("MS Goal updated:", this.msGoal);
                this.updateEffectiveMs();
                this.updateSettings();
            });
            msdelay.addEventListener("input", () => {
                this.msDelay = parseInt(document.getElementById("msdelay").value) || 0;
                console.info("MS Delay updated:", this.msDelay);
                this.updateEffectiveMs();
                this.updateSettings();
            });
            timegoal.addEventListener("input", () => {
                this.timeGoal = (new Date(document.getElementById("timegoal").value)).getTime();
                // Also update msGoal from the input field when timegoal changes
                this.msGoal = parseInt(document.getElementById("msgoal").value) || 0;
                console.info("Time Goal updated:", {
                    input: document.getElementById("timegoal").value,
                    timeGoal: this.timeGoal,
                    date: new Date(this.timeGoal).toLocaleString(),
                    msGoal: this.msGoal
                });
                if (this.timeGoal !== this.prevTimeGoal) {
                    this.updateSendtime();
                    this.prevTimeGoal = this.timeGoal;
                }
                this.updateEffectiveMs();
                this.updateSettings();
            });
            remember.addEventListener("input", () => {
                this.remember = document.getElementById("remember").checked;
                this.updateSettings();
            });
        },
        updateBar: function () {
            var servertime = Math.round(Timing.getCurrentServerTime());
            var accurateMs = getServerMs();
            
            // Calculate current time with accurate milliseconds
            var currentTimeWithMs = Math.floor(servertime / 1000) * 1000 + accurateMs;

            /* Current TW server Timestamp with accurate milliseconds. */
            var element = document.getElementsByClassName("relative_time")[0];
            var timestamp = element.innerHTML.match(/\w+\s+\w+\s+\d+:\d+:\d+/) ?? element.innerHTML.match(/\w+\s+\d+\.\d+\.\s+\w+\s+\d+:\d+:\d+/);
            var msString = ('00' + accurateMs).substr(-3);
            document.getElementById("time").innerHTML = timestamp[0].slice(-8) + '.<span style="font-size:14px;">' + msString + '</span>';

            /* Check if the user has given a timestamp. If so, color the bar based on time remaining. */
            if (!isNaN(this.timeGoal) && this.timeGoal !== 0) {
                // timeGoal is in local time (the time user entered in the datetime input)
                // We need to convert it to server time for comparison
                var targetServerTime = this.timeGoal - this.serverOffset;
                
                // Calculate effective ms (msGoal minus delay)
                var effectiveMs = (this.msGoal - this.msDelay + 1000) % 1000;
                
                // Calculate send time: target arrival time - duration + effective millisecond
                // This is when we need to click send
                var sendtime = targetServerTime - this.duration + effectiveMs;
                
                // Calculate time remaining until send time (in milliseconds)
                var timeRemaining = sendtime - currentTimeWithMs;
                
                // 3-second countdown window (3000ms)
                var countdownWindow = 3000;
                
                var bar = document.getElementById("bar");
                var newColor;
                var percentage;
                
                if (timeRemaining <= 0) {
                    // Past the target time - RED, full bar
                    newColor = "red";
                    percentage = 100;
                } else if (timeRemaining <= countdownWindow) {
                    // Within 3 seconds - GREEN, filling up
                    // At 3000ms remaining: 0%, at 0ms remaining: 100%
                    percentage = ((countdownWindow - timeRemaining) / countdownWindow) * 100;
                    newColor = timeColor;
                } else if (timeRemaining <= 10000) {
                    // Within 10 seconds but more than 3 - YELLOW
                    // Show progress within this window (10s to 3s = 7 seconds)
                    percentage = ((10000 - timeRemaining) / 7000) * 100;
                    newColor = "yellow";
                } else {
                    // More than 10 seconds away - ORANGE
                    percentage = 0;
                    newColor = waitingColor;
                }
                
                document.getElementById("bar").style.width = percentage.toString() + "%";
                
                // Only update color if it actually changed to prevent flickering
                if (bar.style.background !== newColor) {
                    bar.style.background = newColor;
                }
                
                // Debug logging once per second
                if (servertime % 1000 < 50) {
                    console.info("Timing:", {
                        currentTime: new Date(currentTimeWithMs).toLocaleTimeString() + "." + accurateMs,
                        targetTime: new Date(sendtime).toLocaleTimeString() + "." + (sendtime % 1000),
                        timeRemaining: timeRemaining,
                        percentage: percentage.toFixed(1) + "%",
                        color: newColor
                    });
                }
            } else {
                // No target set - show ms goal progress (original behavior)
                var percentage = ((1000 + accurateMs - this.msGoal) % 1000) / 10;
                document.getElementById("bar").style.width = percentage.toString() + "%";
                document.getElementById("bar").style.background = noDateColor;
            }

        },
        updateSendtime: function () {
            stuur = document.getElementById("sendtime");
            if (this.timeGoal !== 0 && !isNaN(this.timeGoal)) {
                var sendTime = this.timeGoal - this.duration + this.serverOffset + (timezoneOffsetHours * 60 * 60 * 1000);
                var sendDate = new Date(sendTime);
                stuur.innerHTML = ("<td>Ora trimiterii:</td><td>" + sendDate.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'numeric'
                }) + "&nbsp;" + "<b>" + sendDate.toLocaleTimeString() + "</b>" + "&nbsp;&nbsp;&nbsp;(<span class='timer' id='timer2' data-endtime='" + sendTime / 1000 + "'></span>)</td>");

                $(window.TribalWars).on("global_tick", async function () {
                    document.title = 'Send in: ' + $('#timer2').text();

                    await checkEndTimeWarning();
                });

                handleTimers();
            } else if (this.timeGoal !== 0 && !isNaN(this.timeGoal)) {
                stuur.innerHTML = ("<td>Timp ramas:</td><td></td>");
                document.title = "No Time Given";
            }
        },
        /* Take a timestamp HH:MM:SS and returns the timestamp in milliseconds. */
        timestampToMs: function (timestamp) {
            return (((timestamp.slice(-8, -6) * 3600) +
                (timestamp.slice(-5, -3) * 60) +
                (timestamp.slice(-2) * 1)) * 1000);
        },
        /* Add CSS to the current document. */
        addGlobalStyle: function (css) {
            var head, style;
            head = document.getElementsByTagName('head')[0];
            if (!head) return;

            style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = css;
            head.appendChild(style);
        }
    };

    SnipeTool.addGlobalStyle("#progress_bar {width: 100%; height: 20px; background-color: grey;}");
    SnipeTool.addGlobalStyle("#time {width: 100%; height: 20px; text-align: center; vertical-align: middle; padding-top:3px; font-weight: bold;}");
    SnipeTool.addGlobalStyle("#bar {width: 0%; background: green; height: 20px; margin-top: -23px;}");
    SnipeTool.addGlobalStyle("#serverMs {font-size: 10px; color: #666;}");
    SnipeTool.addGlobalStyle("#watermark {font-size: 6px; color: grey; text-align: right; margin-top: -10px;}");


    /* Function setting up the snipetool and confirm enhancer. Also checks when to
     * stop updating the script(this happens automatically when you stop sending
     * your attack, but this takes a while. When sending an attack you want the
     * updating bar to stop as soon as possible, to get an idea of how accurate
     * your timing was).
     */
    function startScript() {
        SnipeTool.init();
        Incomings.init();
        /* Interval for updating the snipetool, or delete it if we don't need
         * it anymore. */
        var update = setInterval(function () {
            if (document.getElementById("date_arrival")) {
                SnipeTool.updateBar();
            }
        }, 1000 / SnipeTool.fps);

        $("#troop_confirm_submit").click(function () {
            console.info("sent at", Timing.getCurrentServerTime() % 1000, "ms");
            clearInterval(update);
            SnipeTool.updateSettings();
            Incomings.updateSettings();
        });
    }

    /* When on the rally point, you can immedietly start the script*/
    if (document.getElementById("date_arrival")) {
        startScript();
    } else {
        /* When on the map, check if the user is opening an attack window before
         * starting the script. The script_started statement prevents a bug where
         * the script is being started twice. */
        var script_started = false;
        var x = new MutationObserver(function (e) {
            if (e[0].removedNodes && document.getElementById("date_arrival") && !script_started) {
                script_started = true;
                startScript();
            } else if (!document.getElementById("date_arrival")) {
                script_started = false;
            }
        });
        x.observe(document.getElementById('ds_body'), {childList: true});
    }

    function loadRunningCommands(villageUrl) {
        const targetId = villageUrl.split('id=').pop();

        return twLib.get({
            url: game_data.link_base_pure + 'info_village&id=' + targetId,
        });
    }
})();
