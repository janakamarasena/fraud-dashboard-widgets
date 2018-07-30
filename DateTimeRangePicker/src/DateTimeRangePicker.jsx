import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import './DateTimeRangePicker.css';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';


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
    }

    /*getCurrentDate(){
            let today = new Date();
            let dd = today.getDate();
            let MM = today.getMonth()+1; //January is 0!
            let YYYY = today.getFullYear();
            let hh= today.getHours();
            let mm= today.getMinutes();

            if(dd<10) {
                dd = '0'+dd
            }

            if(MM<10) {
                MM = '0'+MM
            }

            today = YYYY + '-' + MM + '-' + dd +'T'+hh+":"+mm;
            return today;
    }*/

    componentDidMount() {
      //  super.subscribe(this.setReceivedMsg);
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                //super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, message.data.configs.providerConfig);
            })
            .catch((error) => {
                console.log("error", error);
            });

    }
    _handleDataReceived(data) {
        //console.log(data);
    }

    buildMessage(period, type){

    }

    defaultFilter(){
        console.log(this.state.startDateTime);
        console.log(this.state.endDateTime);

        this.setState({ errorMsg: "",
            infoMsg:INFO,
            startDateTime: null,
            endDateTime: null,});

        //super.publish("Initial Message");
    }

    customFilter(){
        let startDT = this.state.startDateTime;
        let endDT = this.state.endDateTime;

        console.log(startDT + " - " + endDT);

        if (!this.isDateRangeValid(startDT, endDT)){
            return;
        }



        //super.publish("Initial Message");
    }

    isDateRangeValid(sDT, eDT){

        if (!sDT || !eDT){
            this.setState({ errorMsg: ERROR_INVALID_DATETIME,
                infoMsg:""});
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
            <div>
                <div className="date-time-container">
                    <TextField
                        className="date-time date-time-start"
                        id="datetime-local-start"
                        label="Start date/time"
                        type="datetime-local"
                        defaultValue={this.state.startDateTime}
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
                        defaultValue={this.state.endDateTime}
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
        );
    }

}

global.dashboard.registerWidget('DateTimeRangePicker', DateTimeRangePicker);