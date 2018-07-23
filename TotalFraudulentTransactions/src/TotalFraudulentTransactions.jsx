import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import { VictoryPie, VictoryChart, VictoryLegend } from 'victory';
import Grid from '@material-ui/core/Grid';
import './TotalFraudulentTransactions.css';

 
class TotalFraudulentTransactions extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            fraudCount: 0,
            fraudAmount: 0,
            scaCount: 0,
            scaAmount: 0,
            exemptCount: 0,
            exemptAmount: 0,
            totCount: 0,
            scaPercent: '0%',
            exemptPercent: '0%',
            nonFraudPercent: '0%',
            data:null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height

        };
        this._handleDataReceived = this._handleDataReceived.bind(this);
       // this.handleResize = this.handleResize.bind(this);

        //this.props.glContainer.on('resize', this.handleResize);

        this.tableConfig = {
            charts: [
                {
                    type: "arc",
                    x: "percent",
                    color: "name",
                    colorScale:["#00FF85","#0085FF","#FFFFFF"],
                    mode: "donut"

                }
            ],
            append: false,
            legend: false
        };

    }

    // handleResize() {
    //     this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    // }

    componentDidMount() {
      //  super.subscribe(this.setReceivedMsg);
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, message.data.configs.providerConfig);
            })
            .catch((error) => {
                console.log("error", error);
            });

    }
    _handleDataReceived(data) {
        // console.log(data);
        // console.log(data.data[0]);
        this.setState({tot:data.data[0].toString()});
        let nTotCount = data.data[0][6];

        if (nTotCount > this.state.totCount){
            let scaPercent =  this.getPercent(data.data[0][2],data.data[0][6]);
            let exemptPercent = this.getPercent(data.data[0][4],data.data[0][6]);
            let nonFraudPercent = this.getPercent(data.data[0][6] - data.data[0][0],data.data[0][6]);
            this.setState({
                fraudCount: data.data[0][0],
                fraudAmount: data.data[0][1],
                scaCount: data.data[0][2],
                scaAmount: data.data[0][3],
                exemptCount: data.data[0][4],
                exemptAmount: data.data[0][5],
                totCount: data.data[0][6],
                scaPercent: scaPercent,
                exemptPercent: exemptPercent,
                nonFraudPercent: nonFraudPercent,
                data: [
                    {
                        x: 1,
                        y: nonFraudPercent
                    },
                    {
                        x: 2,
                        y: exemptPercent
                    },
                    {
                        x: 3,
                        y: scaPercent
                    }
                ]
            });

            // console.log(this.state.data);
        }
    }

    getPercent(val,tot) {
        return (val*100)/tot;
    }
 
    render() {
        const divStyle = {
            textAlign:"center"
        };
        const fraudAmountStyle = {
            color:"#0A68EA",
            marginTop:"-20px"
        };

        const squareGreen = {
            float: "left",
            width: "15px",
            height: "15px",
            margin: "3px",
            border: "0px",
            background: "#00FF85"
        };

        const squareBlue = {
            float: "left",
            width: "15px",
            height: "15px",
            margin: "3px",
            border: "0px",
            background: "#0085FF"
        };

        const totFraud = {
            float: "left",
            marginLeft:"10px"
        };

        const tAlign = {
            textAlign:"left"
        };



        return (
            <div  className="div-style">
                <br/>
                <h1>£{this.state.fraudAmount}</h1>
                <h3 className="fraud-amount-style">{this.state.fraudCount} FRAUDS</h3>
                <br/>
                <br/>
                <Grid container spacing={24}>
                    <Grid item xs={7}>
                        <svg viewBox="85 40 230 120" >
                            <VictoryPie
                                standalone={false}
                                startAngle={90}
                                endAngle={-90}
                                data={this.state.data}
                                height={300}
                                innerRadius={80}
                                labels={(d) =>``}
                                colorScale={["#FFFFFF","#0085FF","#00FF85" ]}
                                animate={{duration: 100}}
                            />
                        </svg>
                        <div className="tot-fraud"><b>{this.state.scaPercent+this.state.exemptPercent}%</b> of total transactions</div>
                    </Grid>
                    <Grid item xs={5}>
                        <Grid style={{marginTop:"2px"}} container direction={"column"} spacing={24}>
                            <Grid item xs={12}>
                                <Grid container>
                                    <Grid item xs={2}>
                                    <div className="square-green"></div>
                                    </Grid>
                                    <Grid className="t-align" item xs={10}>
                                        <div className="legend-name">SCA ({this.state.scaPercent}%)</div>
                                        <div className="legend-amount">£{this.state.scaAmount}</div>
                                        <div className="legend-count">{this.state.scaCount} transactions</div>
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
                                        <div className="legend-amount">£{this.state.exemptAmount}</div>
                                        <div className="legend-count">{this.state.exemptCount} transactions</div>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>




            </div>
        );
    }

}

global.dashboard.registerWidget('TotalFraudulentTransactions', TotalFraudulentTransactions);