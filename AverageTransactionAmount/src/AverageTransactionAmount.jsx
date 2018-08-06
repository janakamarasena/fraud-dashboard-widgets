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
import {VictoryPie} from 'victory';
import Grid from '@material-ui/core/Grid';
import './AverageTransactionAmount.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';

//Query columns
const QC_COUNT = 1;
const QC_AMOUNT = 2;
const QC_DRILL_DOWN_EXEMPT_AVG_AMOUNT = 1;

//Query rows
const QR_SCA = 0;
const QR_EXEMPT = 1;

//Dynamic queries
const MAIN_QUERY = "select " +
    "if(isSCAApplied = 1, 'SCA', 'EXEMPTED') as tra, " +
    "count(ID) as count, sum(amount) as amount " +
    "from TransactionsHistory where {{condition}} group by tra order by tra desc #";
const DRILL_DOWN_QUERY = "select " +
    "exemption, " +
    "round(avg(amount),2) as amount " +
    "from TransactionsHistory where {{condition}} and isSCAApplied = 0 group by exemption #";

/**
 * Displays data related to average payment transaction amounts.
 */
class AverageTransactionAmount extends Widget {

    constructor(props) {
        super(props);
        this.state = {
            totCount: 0,
            totAmountAvg: 0,
            scaAmountAvg: 0,
            exemptAmountAvg: 0,
            scaPercent: 0,
            exemptPercent: 0,
            data: null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            isExemptDrillDownVisible: false,
            scaTotAmount: 0,
            exemptTotAmount: 0,
            dataProviderConf: null,
            drillDownData: [],
            isInitialized: false,
            dTRange: null
        };
        this.drillDownTableConfig = {
            charts: [
                {
                    type: "table",
                    columns: [
                        {
                            name: "exemption",
                            title: "Exemption"
                        },
                        {
                            name: "amount",
                            title: "Average Amount(£)"
                        }
                    ]
                }
            ],
            legend: false,
            append: false
        };
        this.drillDownMetadata = {
            names: [
                "exemption",
                "amount"
            ],
            types: [
                "ordinal",
                "linear"
            ]
        };
        this.handleDataReceived = this.handleDataReceived.bind(this);
        this.hasDataChanged = this.hasDataChanged.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
        this.showDrillDownView = this.showDrillDownView.bind(this);
        this.setReceivedMsg = this.setReceivedMsg.bind(this);
        this.updateProviderConf = this.updateProviderConf.bind(this);
    }

    componentDidMount() {
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                this.setState({
                    dataProviderConf: message.data.configs.providerConfig
                });
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
        this.updateProviderConf(this.state.isExemptDrillDownVisible, receivedMsg);
    }

    /**
     * Updates the providerConf of the widgetConf with a new SQL query.
     */
    updateProviderConf(val, dTRange) {
        let providerConfig = _.cloneDeep(this.state.dataProviderConf);
        providerConfig.configs.config.queryData.query = val === true ? DRILL_DOWN_QUERY : MAIN_QUERY;
        providerConfig.configs.config.queryData.query =
            providerConfig.configs.config.queryData.query.replace(/{{condition}}/g, dTRange.conditionQuery);
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this.handleDataReceived, providerConfig);
    }

    /**
     * Sets the state of the widget after receiving data from the provider.
     */
    handleDataReceived(data) {
        if (data === -1) {
            this.setState({
                totCount: 0,
                totAmountAvg: 0,
                scaAmountAvg: 0,
                exemptAmountAvg: 0,
                scaTotAmount: 0,
                exemptTotAmount: 0,
                scaPercent: 0,
                exemptPercent: 0,
                drillDownData: [[]],
                data: [
                    {
                        x: 1,
                        y: 0
                    },
                    {
                        x: 2,
                        y: 0
                    }
                ]
            });
            return;
        }
        if (!this.state.isExemptDrillDownVisible && this.hasDataChanged(data.data)) {
            let nTotCount = data.data[QR_SCA][QC_COUNT] + data.data[QR_EXEMPT][QC_COUNT];
            let nTotAmount = data.data[QR_SCA][QC_AMOUNT] + data.data[QR_EXEMPT][QC_AMOUNT];
            let nTotAmountAvg = AverageTransactionAmount.getAverage(nTotAmount, nTotCount);
            let nSCAAmountAvg = AverageTransactionAmount.getAverage(
                data.data[QR_SCA][QC_AMOUNT], data.data[QR_SCA][QC_COUNT]);
            let nExemptAmountAvg = AverageTransactionAmount.getAverage(
                data.data[QR_EXEMPT][QC_AMOUNT], data.data[QR_EXEMPT][QC_COUNT]);
            let nSCAPercent = AverageTransactionAmount.getPercentage(data.data[QR_SCA][QC_COUNT],
                data.data[QR_SCA][QC_COUNT] + data.data[QR_EXEMPT][QC_COUNT]);
            let nExemptPercent = AverageTransactionAmount.getPercentage(data.data[QR_EXEMPT][QC_COUNT],
                data.data[QR_SCA][QC_COUNT] + data.data[QR_EXEMPT][QC_COUNT]);
            this.setState({
                totCount: nTotCount,
                totAmountAvg: nTotAmountAvg,
                scaAmountAvg: nSCAAmountAvg,
                exemptAmountAvg: nExemptAmountAvg,
                scaTotAmount: data.data[QR_SCA][QC_AMOUNT],
                exemptTotAmount: data.data[QR_EXEMPT][QC_AMOUNT],
                scaPercent: nSCAPercent,
                exemptPercent: nExemptPercent,
                data: [
                    {
                        x: 1,
                        y: nSCAPercent
                    },
                    {
                        x: 2,
                        y: nExemptPercent
                    }
                ]
            });
        } else if (this.state.isExemptDrillDownVisible && this.hasDataChanged(data.data)) {
            this.setState({
                drillDownData: data.data
            });
        }
    }

    /**
     * Checks whether the received provider data is equal to existing data.
     */
    hasDataChanged(data) {
        if (!this.state.isExemptDrillDownVisible) {
            if (this.state.scaTotAmount !== data[QR_SCA][QC_AMOUNT] ||
                this.state.exemptTotAmount !== data[QR_EXEMPT][QC_AMOUNT]) {
                return true;
            }
        } else {
            if (this.state.drillDownData.length !== data.length) {
                return true;
            }
            for (let i = 0; i < data.length; i++) {
                if (data[i][QC_DRILL_DOWN_EXEMPT_AVG_AMOUNT] !==
                    this.state.drillDownData[i][QC_DRILL_DOWN_EXEMPT_AVG_AMOUNT]) {
                    return true;
                }
            }
        }
    }

    /**
     * Handles the resizing of a widget component.
     */
    handleResize() {
        this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    }

    /**
     * Calculates percentage values required for the widget.
     */
    static getPercentage(val, tot) {
        if (!val || !tot) {
            return 0;
        }
        return AverageTransactionAmount.roundToTwoDecimals((val * 100) / tot);
    }

    /**
     * Calculates average values required for the widget.
     */
    static getAverage(val, count) {
        if (!val || !count) {
            return 0;
        }
        return AverageTransactionAmount.roundToTwoDecimals(val / count);
    }

    /**
     * Rounds up a given number to two decimals.
     */
    static roundToTwoDecimals(num) {
        return Math.round(num * 100) / 100
    }

    /**
     * Toggles the drill down view.
     */
    showDrillDownView(val) {
        this.setState({isExemptDrillDownVisible: val});
        this.updateProviderConf(val, this.state.dTRange);
    }

    render() {
        return (
            <div>
                <div className="main-container" hidden={this.state.isExemptDrillDownVisible}>
                    <h1 style={{marginBottom: "52px"}}>£{this.state.totAmountAvg}</h1>
                    <Grid container spacing={24}>
                        <Grid item xs={7}>
                            <svg viewBox="45 28 280 230" className="pointer">
                                <VictoryPie
                                    standalone={false}
                                    data={this.state.data}
                                    height={230}
                                    innerRadius={82}
                                    labels={(d) => ``}
                                    colorScale={["#00FF85", "#0085FF"]}
                                    animate={{duration: 100}}
                                    events={[{
                                        target: "data",
                                        eventHandlers: {
                                            onClick: (e, d) => {
                                                return d.index === 1 ? this.showDrillDownView(true) : null
                                            }
                                        }
                                    }]}
                                />
                            </svg>
                        </Grid>
                        <Grid item xs={5}>
                            <Grid style={{marginTop: "2px"}} container direction={"column"} spacing={24}>
                                <Grid item xs={12} style={{marginTop: "-12px"}}>
                                    <Grid container>
                                        <Grid item xs={2}>
                                            <div className="square-green"></div>
                                        </Grid>
                                        <Grid className="t-align" item xs={10}>
                                            <div className="legend-name">SCA ({this.state.scaPercent}%)</div>
                                            <div className="legend-amount">£{this.state.scaAmountAvg}</div>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item xs={12}>
                                    <Grid container>
                                        <Grid item xs={2}>
                                            <div className="square-blue"></div>
                                        </Grid>
                                        <Grid className="t-align" item xs={10}>
                                            <div className="legend-name">EXEMPTED ({this.state.exemptPercent}%)</div>
                                            <div className="legend-amount">£{this.state.exemptAmountAvg}</div>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                    <p className="click-tip">
                        * Click on the Exempt slice to get a drill down view.
                    </p>
                </div>
                <div className="main-container" hidden={!this.state.isExemptDrillDownVisible}>
                    <div onClick={() => this.showDrillDownView(false)} className="drill-down-close">&times;</div>
                    <br/>
                    <h2 className="drill-down-title">EXEMPTED</h2>
                    <div style={{margin: "20px"}}>
                        <VizG
                            config={this.drillDownTableConfig}
                            metadata={this.drillDownMetadata}
                            data={this.state.drillDownData}
                            height={this.props.glContainer.height}
                            width={this.props.glContainer.width}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

global.dashboard.registerWidget('AverageTransactionAmount', AverageTransactionAmount);