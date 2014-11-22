function clone(settings){
    return $.extend({}, settings);
}

function format(obj){
    return JSON.stringify(obj, null, "\t");
}

function start_with(str, sub){
    return str.indexOf(sub) === 0;
}

function random_number(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

function async(fn, callback) {
    setTimeout(function() {
        fn();
        callback();
    }, 0);
}

function hide_qtip(){
    $('.qtip').each(function(){
        $(this).qtip('hide')
    });
}

function merge_options(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

var uw_api = (function () {
    var uw_api_key = '7169a9c78a8a6c0f2885854562b114c4';
    var uw_api_url = 'https://api.uwaterloo.ca/v2/';
    var last_request_successful = true;

    var response_code = {
        200: {is_valid: true,  message:"Request successful"},
        204: {is_valid: false, message:"No data returned"},
        401: {is_valid: false, message:"Invalid API key"},
        403: {is_valid: false, message:"The provided API key has been banned"},
        429: {is_valid: false, message:"API request limit reached"},
        501: {is_valid: false, message:"Invalid method"},
        511: {is_valid: false, message:"API key is required (?key=)"}
    };


    var getCourseInfo = function(subject, catalog_number, cb){
        var url = uw_api_url + "courses/" + subject + "/" + catalog_number + ".json";
        $.get( url, { key: uw_api_key })
            .done(function( data ) {
                cb(data);
                last_request_successful = isSuccessfulReponse(data);
                return data;
            });
    }

    var getCourseSchedule = function(subject, catalog_number, term_code, cb){
        var url = uw_api_url + "courses/" + subject + "/" + catalog_number + "/schedule.json";
        var course_name = subject + " " + catalog_number;
        $.get( url, { key: uw_api_key, term: term_code })
            .done(function( data ) {
                cb(course_name, data);
                last_request_successful = isSuccessfulReponse(data);
                return data;
            });
    }

    var isLastRequestSeccessful = function(){
        return last_request_successful;
    }

    var isSuccessfulReponse = function( response ){
        return true;
        return response_code[ response.meta.status ].is_valid; //todo
    }

    return {
        isSuccessfulReponse: isSuccessfulReponse,
        isLastRequestSeccessful: isLastRequestSeccessful,
        getCourseInfo: getCourseInfo,
        getCourseSchedule: getCourseSchedule
    }
}());

//course_list
var select_obj = (function(){
    var list;
    var _length = 0;
    var _id;

    function init(){
        console.log("select_obj init called");
        _id = "course_list";
        list = $("select, #"+_id);
        list.selecter();
        hide_empty_list()
    }

    function get_item(value){
        return list.find('option[value="'+ value +'"]');
    }

    function remove_item(value){
        var item = get_item(value);
        if (item.length > 0) {
            _length -= item.length;
            item.remove();
        }
        console.log("length " + _length);
        list.selecter('refresh');
        hide_empty_list()
    }

    function add_item(value, allow_duplicate){
        if (!value){
            return;
        }
        var item = get_item(value);
        if (!item.length || allow_duplicate){
            list.append('<option value="' + value + '">'+value+'</option>');
            _length++;
        } else {
            return;
        }
        list.selecter('refresh');
        hide_empty_list();
        $("span[data-value='"+value+"']").click();
    }

    function get_length(){
        return _length;
    }

    function hide(to_hide){
        if (to_hide){
            $(".selecter, #"+_id).parent().parent().addClass("hide");
        } else {
            $(".selecter, #"+_id).parent().parent().removeClass("hide");
        }
    }

    function hide_empty_list(){
        hide(!_length);
    }

    function unselect_list(){
        $("span.selecter-item.selected").click()
    }

    function update(){
        list.selecter("update");
    }

    function clear_list(){
        $("select, #" + _id).find("option").remove();
        _length = 0;
        list.selecter('refresh');
        hide_empty_list()
    }

    return {
        init:init,
        add_item:add_item,
        clear_list: clear_list,
        get_length: get_length,
        unselect_list: unselect_list,
        update: update
    }
})();

var courses= (function(){
    var input;

    function has_error(){
        input.parent().removeClass("has-success");
        input.parent().addClass("has-error");
    }

    function has_success(){
        input.parent().removeClass("has-error");
        input.parent().addClass("has-success");
    }

    function neutralize(){
        input.parent().removeClass("has-success has-error");
    }

    function is_valid(){
        return input.parent().hasClass("has-success");
    }

    function select(){
        has_success();
    }

    function check_suggestion(){
        var length = $('.tt-suggestion').length;
        if (length === 0){
            has_error();
        } else if (length === 1){
            has_success();
        }
    }

    function init(){
        console.log("courses init called");

        var my_courses = new Bloodhound({
            datumTokenizer: function(d) {
                var temp_list = Bloodhound.tokenizers.whitespace(d.name);
                var str = temp_list[0] + temp_list[1]; // CS + 245
                temp_list.push(str);
                return temp_list;
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            limit: 5,
            local: course_list
        });

        my_courses.initialize();

        Handlebars.registerHelper('isOnlineCourse', function(block) {
            if (this.offerings.online_only) {
                return block.fn(this);
            } else {
                return block.inverse(this);
            }
        });
        Handlebars.registerHelper('hasOnlineCourse', function(block) {
            if (this.offerings.online) {
                return block.fn(this);
            }
        });

        var suggestion_template = '<div class="label label-info pull-right">' +
                                      '{{#isOnlineCourse}} Online Only {{else}}' +
                                      '{{#hasOnlineCourse}} Has Online {{/hasOnlineCourse}}'+
                                      '{{/isOnlineCourse}}' +
                                  '</div> <div>{{name}}</div> <div style="font-size:14px">{{title}}</div>';
        input = $("#courses");
        input.typeahead({
            hint: true,
            highlight: true,
            autoselect: true,
            minLength: 1
        }, {
            displayKey: 'name',
            source: my_courses.ttAdapter(),
            templates: {
                suggestion: Handlebars.compile( suggestion_template )
            }
        }).on('typeahead:selected typeahead:autocompleted', select)
          .on('input', check_suggestion);

        input.on('keypress', function (e) {
            if (e.which === 13) {
                e.preventDefault();
                if (is_valid()){
                    clear_input();
                }
            }
        });
    }

    function clear_input(){
        select_obj.add_item(input.val());
        neutralize();
        input.val("").trigger("input keypress");
    }

    return {
        init:init,
        clear_input:clear_input
    }
})();

var calendar = (function(){
    var defaults = {
        defaultView: 'agendaWeek',
        header: {
            left: '',
            center: 'title',
            right: ''
        },
        slotDuration: '00:30:00',
        titleFormat: '[UW Course Schedule]',
        weekends: false,
        editable: true,
        allDaySlot: false,
        eventDurationEditable: false,
        height: "auto",
        minTime: "08:00:00",
        maxTime: "24:00:00",
        columnFormat: { week: 'ddd' },
        axisFormat: 'h(:mm)a'
    };
    var event_qtip = {
        content: "", //need content
        position: {
            my: 'bottom left',
            at: 'top right',
            target: 'mouse',
             adjust: {
                 mouse: false
             }
        },
        show: {
            effect: function() {
                $(this).fadeTo(500, 1);
            },
            delay: 500,
            solo:true,
        },
        hide: {
            inactive: 1500,
        },
        style: {
            classes : 'qtip-bootstrap',
        }
    }

    var cls;
    var placeholder_background_color = "#C7C7C7";
    var placeholder_text_color = "#FFFFFF";
    var placeholder_id = 0;
    var count = 3;
    var date,y,m,d;
    var course_data = {};
    var snap_info = {};
    var tooltip_disabled = false;
    var flattened_course_array = [];
    var course_list_length;
    var num_course_responded = 0;
    var course_with_no_schedule = [];
    var placeholder_events_for_comparison = [];

    function init(event_config){
        date = moment();
        y = date.year();
        m = date.month();
        d = date.date();
        var settings = clone(defaults);
        if (event_config){
            settings["events"] = event_config;
        };
        cls = $('#calendar');
        $.extend(settings,{
            eventDragStart : eventDragStart,
            eventDragStop : eventDragStop,
            eventDrop : eventDrop,
            eventClick : eventClick,
            eventRender : eventRender
        });
        cls.fullCalendar(settings);
    }



    function addEvent( event_data, isHoliday ){
        event_data["id"] = ++count;
        if (isHoliday){
            event_data["color"] = placeholder_background_color;
            event_data["textColor"] = placeholder_text_color;
            event_data["annotation"] = true;
            //event_data["placeholder"] = true;
        }
        cls.fullCalendar('renderEvent', event_data, true);
    }

    function eventDragStart(event,jsEvent){
        placeholder_events_for_comparison = [];
        drag_has_overlap = false;
        hide_qtip();
        tooltip_disabled = true;
        //console.log("DragStart");
        var course_type = event.data.type;
        var course_name = event.data.name;
        var id = event.id;
        var my_list = [];
        var this_course = course_data[course_name][course_type];
        for (var i=0; i<this_course.length; i++){
            if (this_course[i][0].id !== id){
                my_list = my_list.concat(this_course[i]);
            }
        }
        var placeholder_events = my_list.map(function(element){
            var ele = clone(element);
            ele["color"] = placeholder_background_color;
            ele["textColor"] = placeholder_text_color;
            ele["placeholder"] = false;
            ele["annotation"] = true;
            ele["data"]["original_id"] = ele["id"];
            ele["id"] = 0;
            return ele;
        })
        renderBatchEvents(placeholder_events);
    }

    function eventDragStop(event){
        tooltip_disabled = false;
        //console.log("dragstop");

        var array = cls.fullCalendar('clientEvents');
        $.each(array, function(index, comp_event){
            if(comp_event.id !== 0){
                return;
            }
            var new_event = {
                data: comp_event.data,
                id: comp_event.id,
                start: comp_event.start,
                end: comp_event.end,
            };
            placeholder_events_for_comparison.push(new_event);
        });
        removePlaceholderEvents();
    }

    function snap_to_placeholder(my_event){
        var array = placeholder_events_for_comparison;
        var has_overlap = false;
        var start,end,id;
        //event_obj from drag is in diff timezone, hence need offset
        var start_this =  moment(my_event.start).add(5,'hours');
        var end_this = moment(my_event.end).add(5, 'hours');
        //console.log("start_this: " + start_this);
        //console.log("end_this: " + end_this);
        var overlap_threshold = 20; //mins
        $.each(array, function(index, comp_event){
            if (has_overlap) return;
            if (!comp_event) return;
            if(comp_event.id != my_event.id && comp_event.id === 0){
                var end_comp = moment(comp_event.end);
                var start_comp = moment(comp_event.start);
                if (!( (start_this.add(overlap_threshold, 'mins') >= end_comp) ||
                       (start_comp.add(overlap_threshold, 'mins') >= end_this) )){
                    has_overlap = true;
                    id = comp_event["data"]["original_id"];
                    start = start_comp;
                    end = end_comp;
                }
            }
        });
        //console.log("has_overlap: " + has_overlap);
        return {
            has_overlap:has_overlap,
            id:id,
            start:start,
            end:end
        }
    }

    function eventDrop(event, delta, revertFunc, jsEvent){
        //console.log("DragDrop");
        snap_info = snap_to_placeholder(event);
        //console.log("snap_info: " + format(snap_info));
        if (!snap_info["has_overlap"]){
            console.log("revert");
            revertFunc();
        } else {
            removeEvents([event.id]);
            var course_type = event.data.type;
            var course_name = event.data.name;
            var id = snap_info.id;
            var events = course_data[course_name][course_type].filter(function(element){
                return element[0].id === id;
            });
            renderBatchEvents(events[0]);
        }
    }

    function eventClick(data, event, view) {
        //console.log("eventClicked");
    }


    function eventRender(event, element) {
        function term_desc_pair(term, desc){
            if (!desc){
                return "";
            }
            var format1 = "<dl><dt>"+term+"</dt><dd>"+desc+"</dd></dl>";
            var format2 = "<span><strong>"+term+"</strong>: "+desc+"</span><br>";
            return format2;
        }

        function enrollment_progress(total, cap){
            var percentage = 0;
            if (total >= cap){
                percentage = 100;
            } else {
                percentage = Math.floor(total * 100.0 / cap);
            }
            var bar_type = "success";
            if (percentage > 90){
                bar_type = "danger";
            } else if (percentage > 80){
                bar_type = "warning";
            }
            var format = '<strong>Enrollment Progress</strong>: ' +
                         '<div class="progress" style="min-width: 100px">' +
                         '<div class="progress-bar progress-bar-'+bar_type+'" role="progressbar" aria-valuemin="0" aria-valuemax="100"' +
                         'aria-valuenow="' + percentage + '"  style="width: '+ percentage + '%;" +>' +
                         '<span class="sr-only">'+percentage+'% Complete</span>'+
                         total + " / " + cap +'</div>'+
                         '</div><br>';
            return format;
        }

        var data = event.data;
        var qtip_config = clone(event_qtip);
        var text =  term_desc_pair("Course Name", data.name)+
                    term_desc_pair("Instructors", data.instructors.join(" | ")) +
                    term_desc_pair("Start", moment(event.start).format("HH:mm"))+
                    term_desc_pair("End", moment(event.end).format("HH:mm"))+
                    term_desc_pair("Location",data.location)+
                    enrollment_progress(data.enrollment_total, data.enrollment_capacity);
        var content = {
            title: event.title,
            text:text
        };
        qtip_config.content = content;
        if (!tooltip_disabled || event.annotation){
            element.qtip(qtip_config);
        }
    }

    function removeEvents(ids){
        cls.fullCalendar('removeEvents', ids);
    }

    function renderEvents(event_data, isStick){
        cls.fullCalendar("renderEvent", event_data, isStick);
    }

    function renderBatchEvents(events){
        cls.fullCalendar( 'addEventSource', events );
    }

    function rerenderEvents(){
        cls.fullCalendar( 'rerenderEvents' );
    }

    function clear(){
        removeEvents();
        course_data = {};
        flattened_course_array = [];
        snap_info = {};
        tooltip_disabled = false;
        course_list_length = num_course_responded = 0;
        course_with_no_schedule = [];
    }

    function removePlaceholderEvents(extra_ids){
        var arr = [0];
        if (extra_ids){
            arr.concat(extra_ids);
        }
        removeEvents(arr);
    }

    function setNumberCourses(number){
        course_list_length = number;
    }

    function processScheduleResponse(name_from_list, response){
        function get_course_time_info(class_info){
            //get weekday
            var weekday_string = ["M","T","W","Th","F"];
            var weekday_list=[];
            var weekdays_str = class_info["weekdays"];
            if (!weekdays_str){
                return [];
            }
            for (var i=0; i<weekday_string.length; i++){
                if (weekdays_str.indexOf(weekday_string[i]) === 0){
                    if (weekday_string[i] === "T" && (weekdays_str.indexOf("Th") ===0)){
                        continue;
                    }
                    weekday_list.push(i+1);
                    weekdays_str = weekdays_str.substr(weekday_string[i].length);
                }
            }

            //start_time, end_time
            var start_h = class_info["start_time"].split(":")[0];
            var start_m = class_info["start_time"].split(":")[1];
            var end_h = class_info["end_time"].split(":")[0];
            var end_m = class_info["end_time"].split(":")[1];

            var fix = date.weekday();
            var class_list = [];
            for (var i=0; i<weekday_list.length; i++){
                var offset = weekday_list[i] - fix;
                class_list.push({
                    start: moment({y:y,M:m,d:d+offset,h:start_h,m:start_m}),
                    end: moment({y:y,M:m,d:d+offset,h:end_h,m:end_m})
                })
            }

            return class_list;
        }

        var arrangement_found = false;
        var arranged_events = [];
        function event_has_overlap(cur_event, event_list){
            var start_i = moment(cur_event.start);
            var end_i = moment(cur_event.end);
            var len = event_list.length;
            for (var j=0; j<len; j++){
                var start_j = moment(event_list[j].start);
                var end_j = moment(event_list[j].end);
                if (!((start_i >= end_j) || (start_j >= end_i))){
                    return true;
                }
            }
            return false;
        }

        function auto_arrange_course(depth,complete_course_list,events_list){
            if (arrangement_found) {return};
            if (depth >= complete_course_list.length){
                arrangement_found = true;
                arranged_events = [].concat(events_list);
                return;
            }
            for (var i=0; i<complete_course_list[depth].length; i++){
                var added_length = complete_course_list[depth][i].length;
                var overlapped = false;
                for (var j=0; j<complete_course_list[depth][i].length; j++){
                    var cur_event = complete_course_list[depth][i][j];
                    if (event_has_overlap(cur_event, events_list)){
                        overlapped = true;
                        break;
                    }
                }
                if (overlapped){
                    continue;
                }
                events_list = events_list.concat(complete_course_list[depth][i]);
                auto_arrange_course(depth+1, complete_course_list, events_list);
                for (var j=0;j<added_length;j++){
                    events_list.pop();
                }
            }
        }


        function prepare_for_search(){
            //console.log("flattened_array: " + format(flattened_course_array));
            submit_btn.stop_spin();
            arrangement_found = false;
            arranged_events = [];
            if (!flattened_course_array.length){
                alertify.set({delay: 3000});
                alertify.error("No courses scheduled.");
                return;
            }
            async(function(){
                auto_arrange_course(0, flattened_course_array, []);
            }, function(){
                alertify.set({delay: 3000});
                if (!(arranged_events.length)){
                    for (var i=0; i<flattened_course_array.length; i++){
                        arranged_events = arranged_events.concat(flattened_course_array[i][0]);
                    }
                    alertify.error("I am telling you human, there is no non-conflicting schedule.");
                } else {
                    alertify.success("Hey, I just found you a non-conflicting schedule. Be aware that some courses are not scheduled in campus");
                }
                renderBatchEvents(arranged_events);
            })
        }

        //TODO check response;
        var data = response["data"];
        var valid = true;
        if (!data.length){
            alertify.set({delay: 3000});
            alertify.error(name_from_list + " is not found. Perhaps it is not offered this term");
            course_with_no_schedule.push(name_from_list);
            valid = false;
        }

        //console.log("data: " + format(data));
        //console.log(format(data[0]["classes"].date));
        //check course available
        if (valid && !(data.length && data[0] && data[0]["classes"].length && data[0]["classes"][0].date.start_time)){
            alertify.set({delay: 3000});
            alertify.error(name_from_list + " does not have a real schedule");
            course_with_no_schedule.push(name_from_list);
            valid = false;
        }

        if (num_course_responded + course_with_no_schedule.length >= course_list_length){
            if (course_with_no_schedule.length == course_list.length){
                alertify.set({delay:3000});
                alertify.error("None of the selected courses is scheduled in campus");
            } else {
                prepare_for_search();
            }
        }
        if (!valid){
            return;
        }

        var course_type_array = [];
        var events = [];
        var arranged_events = [];
        var course_name = data[0]["subject"] + data[0]["catalog_number"];

        course_data[course_name] = {};

        $.each(data, function(index, obj){
            var course_type = obj["section"].substr(0,3);
            if (course_type == "TST"){
                return; //dont show TST in week view
            }
            if (!(course_type in course_data[course_name])){
                course_data[course_name][course_type] = new Array();
            }
            if (course_type_array.indexOf(course_type) == -1){
                course_type_array.push(course_type);
            }
            var id = course_name + obj["section"];
            var date = obj["classes"][0]["date"];
            var color_str = course_type + "_color";
            if (!(color_str in course_data[course_name])){
                course_data[course_name][color_str] = color.next_color();
                //console.log("course_data color? Y" + course_data[course_name][color_str]);
            } else {
                //console.log("course_data color? N" + course_data[course_name][color_str]);
            }
            var class_info = {
                start_time: date["start_time"],
                end_time: date["end_time"],
                weekdays: date["weekdays"]
            }
            var my_list = get_course_time_info(class_info);
            var classes = [];
            $.each(my_list, function(index, time_info){
                if (!time_info["start"]){
                    return;
                }
                var event_data = {
                    data : {
                        type: course_type,
                        name: course_name,
                        weekdays:date["weekdays"],
                        enrollment_capacity: obj["enrollment_capacity"],
                        enrollment_total: obj["enrollment_total"],
                        instructors: obj["classes"][0]["instructors"],
                        location: obj["classes"][0]["location"]["building"] + " " + obj["classes"][0]["location"]["room"]
                    },
                    title: course_name + " - " + obj["section"],
                    id : id,
                    start: time_info["start"],
                    end: time_info["end"],
                    backgroundColor: course_data[course_name][color_str],
                    borderColor: course_data[course_name][color_str]
                }
                classes.push(event_data);
                //console.log("event_data? " + format(event_data));
            });
            //console.log("course_data: "  + format(course_data));
            //console.log(course_name + " " + course_type);
            //console.log("classes: " + format(classes));
            if (classes.length != 0){
                course_data[course_name][course_type].push(classes);
            }

        });

        // LEC > LAB > TUT
        //console.log(format(course_type_array));
        var flattened_course_type_info = {};
        $.each(course_type_array, function(index, course_type){
            flattened_course_type_info[course_type] = [];
        });
        $.each(course_type_array, function(index, course_type){
            if (course_data[course_name][course_type].length){
                flattened_course_type_info[course_type].push(course_data[course_name][course_type]);
            };
        });
        $.each(course_type_array, function(index, course_type){
            flattened_course_array = flattened_course_array.concat(flattened_course_type_info[course_type]);
        });

        num_course_responded = num_course_responded + 1;
        if (num_course_responded + course_with_no_schedule.length >= course_list_length){
            prepare_for_search();
            return;
        }
    }

    return {
        init:init,
        removeEvents:removeEvents,
        clear:clear,
        removePlaceholderEvents:removePlaceholderEvents,
        addEvent:addEvent,
        processScheduleResponse:processScheduleResponse,
        setNumberCourses:setNumberCourses
    }
})();

var color = (function(){
    var unselected = ["#09AA77","#13AA98","#246B69","#283A77","#2F5E6F","#309166","#33993A","#3DECF5","#413091","#4309AE","#57246B","#69ADE8","#6AEC8F","#6B4024","#6E74CF","#6FF542","#7186EF","#7DE8BF","#87D4D0","#8CEDD3","#A188EC","#A9A2D7","#AB2BDA","#B83D91","#B8B3E6","#BABA5E","#BF4840","#CE7DD4","#D043C2","#E8E12C","#F35912","#FF706B","#FFB894","#FFC7E6","#FFD86B","#FFDA05"];
    var selected = [];

    function next_color(){
        var index = random_number(0,unselected.length-1);
        var color_str = unselected[index];
        selected.push(color_str);
        var index = unselected.indexOf(color_str);
        unselected.splice(index, 1);
        return color_str;
    }

    function clear(){
        $.each(selected, function(index, obj){
            unselected.push(obj);
        });
        selected = [];
        return;
    }

    return {
        next_color:next_color,
        clear:clear
    }
})();

var submit_btn=(function(){
    var l;
    function init(){
        console.log("submit_btn init called");
        l = Ladda.create( document.querySelector( '#form_submit_btn' ) );
    }
    function start_spin(){
        l.start();
    }
    function stop_spin(){
        l.stop();
    }
    return {
        init:init,
        start_spin:start_spin,
        stop_spin:stop_spin
    }
})();

var term_toggle = (function(){
    var next_term_code;
    var cur_term_code;

    function format_month(x){
        if (x >= 8){
            return 9;
        } else if (x >= 4) {
            return 5;
        } else
            return 1;
    }

    function format_term_str(x){
        if (x == 1) return "Winter";
        if (x == 5) return "Spring";
        if (x == 9) return "Fall";
    }

    function init(){
        console.log("term_toggle.init called");

        var base_str = "1"; //21st century.
        var cur = moment();
        var next = moment().add(4,'M');
        var cur_year = cur.format("YY");
        var next_year = next.format("YY");
        var cur_month = format_month(cur.month());
        var next_month = format_month(next.month());
        cur_term_code = base_str + cur_year + cur_month;
        var cur_title = format_term_str(cur_month) + " " + cur.format("YYYY");
        next_term_code = base_str + next_year + next_month;
        var next_title = format_term_str(next_month) + " " + next.format("YYYY");

        //default to next term
        $('#term_toggle').bootstrapToggle({
            on: next_title,
            off: cur_title,
            offstyle:"info"
        });
    }

    function is_next_term(){
        return $("#term_toggle:checked").length;
    }

    function get_term_code(){
        if (is_next_term()){
            //console.log("next_term_code " + next_term_code);
            return next_term_code;
        } else {
            //console.log("cur_term_code " + cur_term_code);
            return cur_term_code;
        }
    }

    return {
        init:init,
        get_term_code:get_term_code
    }
})();

var init = function(){
    console.log("course-selection.init called");
    select_obj.init();
    calendar.init();
    courses.init();
    submit_btn.init()
    term_toggle.init();
    $("#my_form").submit(on_form_submmit);
    $("#unselect_course_btn").click(on_list_unselect);
    $("#clear_course_btn").click(on_list_clear);
};

function on_list_unselect(e){
    //console.log(1);
    select_obj.unselect_list();
    //console.log(2);
    calendar.clear();
}

function on_list_clear(e){
    select_obj.clear_list();
}

function on_form_submmit(e){
    var selected_courses = [];
    var max_num_course = 7;

    function add_courses_to_calendar(){
        var term_code = term_toggle.get_term_code();
        //console.log("term code: " + term_code);
        calendar.setNumberCourses(selected_courses.length);
        if (selected_courses.length){
            selected_courses.forEach(function(entry){
                    var arr = entry.split(/\s+/);
                    var subject = arr[0];
                    var catalog_number = arr[1];
                    uw_api.getCourseSchedule(subject, catalog_number, term_code, calendar.processScheduleResponse);
            });
        } else {
            submit_btn.stop_spin();
        }
    }
    if (e.preventDefault) e.preventDefault();
    calendar.clear();
    color.clear();
    courses.clear_input();
    console.log("form submitted");
    $('.course_list option:selected').each(function(){
        selected_courses.push(this.getAttribute("value").toUpperCase());
    });
    if (selected_courses.length > max_num_course){
        var str = "You have selected more than " + max_num_course + " courses. Calm down...";
        alertify.set({ delay: 3000 });
        alertify.error(str);
        return false;
    }
    if (selected_courses.length == 0){
        alertify.set({ delay: 3000 });
        alertify.log("No course selected");
        return false;
    }
    alertify.log("Trying my best to arrange your course schedule...", "", 3000);
    submit_btn.start_spin();
    add_courses_to_calendar();

    return false;

}