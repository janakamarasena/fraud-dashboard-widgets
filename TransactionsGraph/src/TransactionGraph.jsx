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
import './TransactionGraph.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import {MuiThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import JssProvider from 'react-jss/lib/JssProvider';

const darkTheme = createMuiTheme({
    palette: {
        type: "dark"
    }
});

const lightTheme = createMuiTheme({
    palette: {
        type: "light"
    }
});

//Dynamic queries
const QUERY_AMOUNT = "select " +
    "{{period}} as period, " +
    "round(sum(amount), 2)  as amount, " +
    "if(isSCAApplied = 1, 'SCA', 'EXEMPTED') as tra " +
    "from TransactionsHistory where {{condition}} group by period, isSCAApplied order by period asc, tra desc #";
const QUERY_COUNT = "select {{period}} as period, " +
    "count(*) as count, " +
    "if(isSCAApplied = 1, 'SCA', 'EXEMPTED') as tra " +
    "from TransactionsHistory where {{condition}} group by  period, isSCAApplied order by period asc, tra desc #";

/**
 * Displays graphs on payment transactions (Amounts and Counts) broken down as SCA and Exempted.
 */
class TransactionGraph extends Widget {

    constructor(props) {
        super(props);
        this.state = {
            gData: [],
            tValue: 0,
            dataProviderConf: null,
            metadata: null,
            chartConfig: null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            isInitialized: false,
            dTRange: null
        };
        this.handleDataReceived = this.handleDataReceived.bind(this);
        this.handleTabChange = this.handleTabChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.setReceivedMsg = this.setReceivedMsg.bind(this);
        this.updateWidgetConf = this.updateWidgetConf.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
    }

    componentDidMount() {
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                this.setState({dataProviderConf: message.data.configs.providerConfig});
                //Subscribes to the DateTimeRangePicker widget.
                super.subscribe(this.setReceivedMsg);
                if (!this.state.isInitialized) {
                    //Sends initialization message to the DateTimeRangePicker widget.
                    super.publish("init");
                }
            })
            .catch((error) => {
                console.log("error", error);
            });
    }

    /**
     * Handles the message received from the DateTimeRangePicker widget.
     */
    setReceivedMsg(receivedMsg) {
        if (!this.state.isInitialized) {
            this.setState({isInitialized: true});
        }
        this.setState({dTRange: receivedMsg});
        //Removes data from the widget.
        this.handleDataReceived(-1);
        this.updateWidgetConf(this.state.tValue, receivedMsg);
    }

    /**
     * Updates the providerConf of the widgetConf with a new SQL query.
     * Updates the config and metadata of the charts with new axis data.
     */
    updateWidgetConf(value, dTRange) {
        let yAxis = value === 0 ? "amount(£)" : "count";
        let nChartConfig = {
            x: dTRange.type,
            charts: [
                {
                    type: "line",
                    y: yAxis,
                    color: "tra",
                    colorScale: ["#00FF85", "#0085FF"],
                    style: {strokeWidth: 2, markRadius: 5}
                }
            ],
            append: false,
            legend: true
        };
        let nMetadata = {
            names: [
                dTRange.type,
                yAxis,
                "tra"
            ],
            types: [
                "linear",
                "linear",
                "ordinal"
            ]
        };
        this.setState({chartConfig: nChartConfig, metadata: nMetadata});
        let providerConfig = _.cloneDeep(this.state.dataProviderConf);
        providerConfig.configs.config.queryData.query = value === 0 ? QUERY_AMOUNT : QUERY_COUNT;
        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query
            .replace(/{{condition}}/g, dTRange.conditionQuery)
            .replace(/{{period}}/g, dTRange.periodQuery);
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this.handleDataReceived, providerConfig);
    }

    /**
     * Sets the state of the widget after receiving data from the provider.
     */
    handleDataReceived(data) {
        this.setState({gData: data === -1 ? [] : TransactionGraph.convertDataToInt(data.data)});
    }

    /**
     * Handles the resizing of a widget component.
     */
    handleResize() {
        this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    }

    /**
     * Toggles the view between Amount graph and Count graph.
     */
    handleTabChange(value) {
        this.setState({tValue: value});
        this.updateWidgetConf(value, this.state.dTRange);
    };

    /**
     * Converts string data of the chart x-axis to integers.
     */
    static convertDataToInt(data) {
        for (let i = 0; i < data.length; i++) {
            data[i][0] = parseInt(data[i][0]);
        }
        return data;
    }

    render() {
        return (
            <div>
                <div className="tab-margins">
                    <JssProvider generateClassName={generateClassName}>
                        <MuiThemeProvider theme={this.props.muiTheme.name === 'dark' ? darkTheme : lightTheme}>
                            <Tabs
                                value={this.state.tValue}
                                indicatorColor="primary"
                                textColor="primary"
                                onChange={(e, v) => this.handleTabChange(v)}
                                centered
                            >
                                <Tab label="AMOUNT"/>
                                <Tab label="COUNT"/>
                            </Tabs>
                        </MuiThemeProvider>
                    </JssProvider>
                </div>
                <br/>
                <VizG
                    config={this.state.chartConfig}
                    metadata={this.state.metadata}
                    data={this.state.gData}
                    height={this.props.glContainer.height - 75}
                    width={this.props.glContainer.width + 100}
                />
            </div>
        );
    }
}

//This is the workaround suggested in https://github.com/marmelab/react-admin/issues/1782
const escapeRegex = /([[\].#*$><+~=|^:(),"'`\s])/g;
let classCounter = 0;

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

global.dashboard.registerWidget('TransactionGraph', TransactionGraph);


