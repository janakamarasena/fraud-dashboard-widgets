/*
 *  Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 *
 */

import React from 'react';
import Widget from '@wso2-dashboards/widget';
import './DateTimeRangePicker.css';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import JssProvider from 'react-jss/lib/JssProvider';

// Info and error messages
const ERROR_NEGATIVE_DURATION = '*ERROR: start date/time cannot be greater than end date/time.';
const ERROR_EXCEEDING_CURRENT_DATETIME = '*ERROR: filter date/time cannot exceed current date/time.';
const ERROR_INVALID_DATETIME = '*ERROR: invalid date/time.';
const INFO = '*Currently showing the past 90 days in real-time (filter not applied).';

// Types
const TYPE_DAYS = 1;
const TYPE_MONTHS = 2;
const TYPE_YEARS = 3;

/**
 * Widget that provides the date and time filtering capability for other widgets.
 */
class DateTimeRangePicker extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            startDateTime: null,
            endDateTime: null,
            errorMsg: '',
            infoMsg: INFO,
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

    /**
     * Listens to other widgets initialize message.
     */
    setReceivedMsg(receivedMsg) {
        if (receivedMsg === 'init') {
            this.defaultFilter();
        }
    }

    /**
     * Creates a message to filter date time range for the past 90 days
     * from the current time.
     */
    defaultFilter() {
        this.setState({ errorMsg: '', infoMsg: INFO });
        const msg = DateTimeRangePicker.buildMessage(TYPE_MONTHS);
        super.publish(msg);
    }

    /**
     * Creates a message to filter date time range for given user input.
     */
    customFilter() {
        const sDT = this.state.startDateTime;
        const eDT = this.state.endDateTime;
        if (!this.isDateRangeValid(sDT, eDT)) {
            return;
        }
        const startDT = new Date(sDT);
        const endDT = new Date(eDT);
        const startDTUNIX = Math.round(startDT.getTime() / 1000);
        const endDTUNIX = Math.round(endDT.getTime() / 1000);
        let msg = '';
        if (startDT.getFullYear() === endDT.getFullYear()) {
            if (startDT.getMonth() === endDT.getMonth()) {
                // days
                msg = DateTimeRangePicker.buildMessage(TYPE_DAYS, startDTUNIX, endDTUNIX);
            } else {
                // months
                msg = DateTimeRangePicker.buildMessage(TYPE_MONTHS, startDTUNIX, endDTUNIX);
            }
        } else {
            // years
            msg = DateTimeRangePicker.buildMessage(TYPE_YEARS, startDTUNIX, endDTUNIX);
        }
        super.publish(msg);
    }

    /**
     * Validates user input.
     */
    isDateRangeValid(sDT, eDT) {
        if (!sDT || !eDT) {
            this.setState({ errorMsg: ERROR_INVALID_DATETIME, infoMsg: '' });
            return false;
        }
        const currentDT = new Date().getTime();
        const startDT = new Date(sDT).getTime();
        const endDT = new Date(eDT).getTime();
        if (startDT > currentDT || endDT > currentDT) {
            this.setState({ errorMsg: ERROR_EXCEEDING_CURRENT_DATETIME, infoMsg: '' });
            return false;
        }
        if (startDT > endDT) {
            this.setState({ errorMsg: ERROR_NEGATIVE_DURATION, infoMsg: '' });
            return false;
        }
        this.setState({ errorMsg: '', infoMsg: '' });
        return true;
    }

    /**
     * Creates the publish message.
     */
    static buildMessage(typeVal, startDT, endDT) {
        let type = '';
        let period = '';
        let conditionQuery = '';
        switch (typeVal) {
            case TYPE_DAYS:
                type = 'day';
                period = '%d';
                break;
            case TYPE_MONTHS:
                type = 'month';
                period = '%m';
                break;
            case TYPE_YEARS:
                type = 'year';
                period = '%Y';
        }
        const periodQuery = "FROM_UNIXTIME(timestamp,'" + period + "')";
        if (startDT && endDT) {
            conditionQuery = 'timestamp >= ' + startDT + ' and timestamp <= ' + endDT;
        } else {
            conditionQuery = 'FROM_UNIXTIME(timestamp) > SUBDATE(NOW(),90)';
        }
        return {
            periodQuery,
            conditionQuery,
            type,
        };
    }

    render() {
        return (
            <JssProvider generateClassName={generateClassName}>
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
                            onChange={e => this.setState({ startDateTime: e.target.value })}
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
                            onChange={e => this.setState({ endDateTime: e.target.value })}
                        />
                        <Button
                            onClick={() => this.customFilter()}
                            variant="contained"
                            size="small"
                            color="primary"
                            className="btn-filter-custom"
                        >
                            Filter
                        </Button>
                        <Button
                            onClick={() => this.defaultFilter()}
                            variant="contained"
                            size="small"
                            color="default"
                            className="btn-filter-default"
                        >
                            Show past 90 days
                        </Button>
                    </div>
                    <p className="error-msg">
                        {this.state.errorMsg}
                    </p>
                    <p className="info-msg">
                        {this.state.infoMsg}
                    </p>
                </div>
            </JssProvider>
        );
    }
}

// This is the workaround suggested in https://github.com/marmelab/react-admin/issues/1782
const escapeRegex = /([[\].#*$><+~=|^:(),"'`\s])/g;
let classCounter = 1000;

export const generateClassName = (rule, styleSheet) => {
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
