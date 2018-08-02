import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import './DateTimeRangePicker.css';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {generateClassName} from "../../TransactionsGraph/src/TransactionGraph";
import JssProvider from 'react-jss/lib/JssProvider';

//info/error messages
const ERROR_NEGATIVE_DURATION = "*ERROR: start date/time cannot be greater than end date/time.";
const ERROR_EXCEEDING_CURRENT_DATETIME = "*ERROR: filter date/time cannot exceed current date/time.";
const ERROR_INVALID_DATETIME = "*ERROR: invalid date/time.";
const INFO = "*Currently showing the past 90 days in real-time (filter not applied).";

//types
const TYPE_DAYS = 1;
const TYPE_WEEKS = 2;
const TYPE_MONTHS = 3;
const TYPE_QUARTERS = 4;
const TYPE_YEARS = 5;

class DateTimeRangePicker extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            startDateTime: null,
            endDateTime: null,
            errorMsg:"",
            infoMsg:INFO
        };
        this.defaultFilter = this.defaultFilter.bind(this);
        this.customFilter = this.customFilter.bind(this);
        this.setReceivedMsg = this.setReceivedMsg.bind(this);
        this.isDateRangeValid = this.isDateRangeValid.bind(this);
    }

    componentDidMount() {
        this.defaultFilter();
        super.subscribe(this.setReceivedMsg);
    }

    setReceivedMsg(receivedMsg) {
        if (receivedMsg === "init") {
            this.defaultFilter();
        }
    }

    buildMessage(typeVal, startDT, endDT){
        let type = "";
        let period = "";
        let conditionQuery ="";

        switch(typeVal) {
            case TYPE_DAYS:
                type = "day";
                period = "%d";
                break;
            case TYPE_MONTHS:
                type = "month";
                period = "%m";
                break;
            case TYPE_YEARS:
                type = "year";
                period = "%Y";
        }

        let periodQuery = "FROM_UNIXTIME(timestamp,'"+period+"')";

        if (startDT && endDT) {
            conditionQuery = "timestamp >= " + startDT + " and timestamp <= " + endDT;
        } else {
            conditionQuery = "FROM_UNIXTIME(timestamp) > SUBDATE(NOW(),90)";
        }

        return {"periodQuery":periodQuery,
            "conditionQuery":conditionQuery,
            "type":type
            };
    }

    defaultFilter(){
        this.setState({ errorMsg: "",
            infoMsg:INFO});

        /*this.setState({ errorMsg: "",
            infoMsg:INFO,
            startDateTime: null,
            endDateTime: null,});*/

        let msg = this.buildMessage(TYPE_MONTHS);
        super.publish(msg);
    }

    customFilter(){
        let sDT = this.state.startDateTime;
        let eDT = this.state.endDateTime;
        // console.log(sDT +"-"+ eDT);


        if (!this.isDateRangeValid(sDT, eDT)){
            return;
        }

        let startDT = new Date(sDT);
        let endDT = new Date(eDT);
        //console.log(startDT +"-"+ endDT);
        // console.log((startDT/1000 | 0) +"-"+ (endDT/1000 | 0));
        // console.log(startDT.getMilliseconds() +"-"+ endDT.getMilliseconds());
        // console.log(startDT.getTime() +"-"+ endDT.getTime());
        let startDTUNIX = Math.round(startDT.getTime() / 1000);
        let endDTUNIX = Math.round(endDT.getTime() / 1000);
        let msg = "";

        // console.log(startDTUNIX +"-"+ endDTUNIX);

        if (startDT.getFullYear() === endDT.getFullYear()){
            if (startDT.getMonth() === endDT.getMonth()) {
                //days
                msg = this.buildMessage(TYPE_DAYS, startDTUNIX, endDTUNIX);
            }else {
                //months
                msg = this.buildMessage(TYPE_MONTHS, startDTUNIX, endDTUNIX);
            }
        }else {
            //years
            msg = this.buildMessage(TYPE_YEARS, startDTUNIX, endDTUNIX);
        }
        super.publish(msg);
    }

    isDateRangeValid(sDT, eDT){

        if (!sDT || !eDT){
            this.setState({ errorMsg: ERROR_INVALID_DATETIME,
                infoMsg:""});
            console.log(sDT +"-date range invalid-"+ eDT);
            return false;
        }

        let currentDT = new Date().getTime();
        let startDT = new Date(sDT).getTime();
        let endDT = new Date(eDT).getTime();

        if (startDT > currentDT ||  endDT > currentDT){
            this.setState({ errorMsg: ERROR_EXCEEDING_CURRENT_DATETIME,
                infoMsg:""});
            return false;
        }

        if (startDT > endDT){
            this.setState({ errorMsg: ERROR_NEGATIVE_DURATION,
                infoMsg:""});
            return false;
        }

        this.setState({ errorMsg: "",
            infoMsg:""});

        return true;
    }


 
    render() {
        return (
            <JssProvider generateClassName={generateClassNameForDTRP}>
            <div>
                <div className="date-time-container">
                    <TextField
                        className="date-time date-time-start"
                        id="datetime-local-start"
                        label="Start date/time"
                        type="datetime-local"
                        InputLabelProps={{
                            shrink: true,
                        }}
                        value={this.state.startDateTime}
                        onChange={(e) => this.setState({ startDateTime: e.target.value})}
                    />

                    -

                    <TextField
                        className="date-time date-time-end"
                        id="datetime-local-start"
                        label="End date/time"
                        type="datetime-local"
                        InputLabelProps={{
                            shrink: true,
                        }}
                        value={this.state.endDateTime}
                        onChange={(e) => this.setState({ endDateTime: e.target.value})}
                    />
                    <Button onClick={() => this.customFilter()} variant="contained" size="small" color="primary" className="btn-filter-custom">
                        Filter
                    </Button>
                    <Button onClick={() => this.defaultFilter()} variant="contained" size="small" color="default" className="btn-filter-default">
                        Show past 90 days
                    </Button>
                </div>
                <p className="error-msg">{this.state.errorMsg}</p>
                <p className="info-msg">{this.state.infoMsg}</p>
            </div>
            </JssProvider>
        );
    }

}

//This is the workaround suggested in https://github.com/marmelab/react-admin/issues/1782
const escapeRegex = /([[\].#*$><+~=|^:(),"'`\s])/g;
let classCounter = 1000;

export const generateClassNameForDTRP = (rule, styleSheet) => {
    classCounter += 1;

    if (process.env.NODE_ENV === 'production') {
        return `c${classCounter}`;
    }

    if (styleSheet && styleSheet.options.classNamePrefix) {
        let prefix = styleSheet.options.classNamePrefix;
        // Sanitize the string as will be used to prefix the generated class name.
        prefix = prefix.replace(escapeRegex, '-');

        if (prefix.match(/^Mui/)) {
            return `${prefix}-${rule.key}`;
        }

        return `${prefix}-${rule.key}-${classCounter}`;
    }

    return `${rule.key}-${classCounter}`;
};

global.dashboard.registerWidget('DateTimeRangePicker', DateTimeRangePicker);